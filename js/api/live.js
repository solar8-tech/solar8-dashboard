const LIVE_DATA_STALE_MS = 150 * 1000;
const LIVE_BUCKET_GRACE_MS = 75 * 1000;
const LIVE_FRESHNESS_TICK_MS = 15 * 1000;
const LIVE_STORAGE_PREFIX = "solar8.deviceFreshness";

window.Live = (() => {
    let freshnessIntervalId = null;

    function buildMetricSignature(metrics) {
        const parts = [
            metrics.instantPower,
            metrics.dailyProduction,
            metrics.revenue
        ].map((value) => Number.isFinite(value) ? Number(value).toFixed(6) : "null");

        return parts.every((part) => part === "null") ? null : parts.join("|");
    }

    function resolveFreshness(api, cards, deviceMetricSignature) {
        const timestampValue = _pickFirstPresent([
            api.measured_at,
            api.measuredAt,
            api.timestamp_utc,
            api.telemetry_timestamp_utc,
            api.last_data_timestamp_utc,
            api.last_seen_at,
            api.inverter_telemetry_data?.meta?.timestamp_utc,
            api.telemetry?.timestamp_utc,
            api.telemetry?.last_seen_at,
            cards.measured_at,
            cards.measuredAt,
            cards.timestamp_utc,
            cards.telemetry_timestamp_utc,
            cards.last_data_timestamp_utc,
            cards.last_seen_at,
            cards.inverter_telemetry_data?.meta?.timestamp_utc,
            cards.telemetry?.timestamp_utc,
            cards.telemetry?.last_seen_at
        ]);

        const telemetryOk = _resolveTelemetryOk([
            api.telemetry?.is_data_read_successful,
            api.network?.is_connected,
            api.wifi?.is_wifi_connected
        ]);

        const signatureFreshness = _resolveMetricSignatureFreshness(deviceMetricSignature);
        const lastSeenAt = _parseTimestamp(timestampValue);
        const staleAfterMs = lastSeenAt ? _getTimestampStaleAfterMs(lastSeenAt) : LIVE_DATA_STALE_MS;
        const ageMs = lastSeenAt ? Date.now() - lastSeenAt.getTime() : null;
        const isStale = Number.isFinite(ageMs) && ageMs > staleAfterMs;

        if (telemetryOk === false) {
            return {
                isActive: false,
                reason: "data_read_failed",
                telemetryOk,
                lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
                rawTimestamp: timestampValue ?? null,
                ageMs
            };
        }

        if (isStale) {
            return { isActive: false, reason: "stale", telemetryOk: telemetryOk ?? null, lastSeenAt: lastSeenAt.toISOString(), rawTimestamp: timestampValue ?? null, ageMs };
        }

        if (timestampValue !== undefined && timestampValue !== null && timestampValue !== "" && !lastSeenAt) {
            return { isActive: false, reason: "invalid_timestamp", telemetryOk: telemetryOk ?? null, lastSeenAt: null, rawTimestamp: timestampValue, ageMs: null };
        }

        if (lastSeenAt) {
            return { isActive: true, reason: "fresh", telemetryOk: telemetryOk ?? null, lastSeenAt: lastSeenAt.toISOString(), rawTimestamp: timestampValue ?? null, ageMs };
        }

        if (signatureFreshness && signatureFreshness.ageMs > LIVE_DATA_STALE_MS) {
            return {
                isActive: false,
                reason: "stale",
                staleSource: "unchanged_metrics",
                telemetryOk: telemetryOk ?? null,
                lastSeenAt: null,
                rawTimestamp: null,
                ageMs: signatureFreshness.ageMs,
                signatureFirstSeenAt: new Date(signatureFreshness.firstSeenAt).toISOString()
            };
        }

        return {
            isActive: true,
            reason: "missing_timestamp",
            telemetryOk: telemetryOk ?? null,
            lastSeenAt: null,
            rawTimestamp: null,
            ageMs: signatureFreshness?.ageMs ?? null,
            signatureFirstSeenAt: signatureFreshness ? new Date(signatureFreshness.firstSeenAt).toISOString() : null
        };
    }

    function startFreshnessTimer() {
        stopFreshnessTimer();
        freshnessIntervalId = setInterval(expireStaleData, LIVE_FRESHNESS_TICK_MS);
        expireStaleData();
    }

    function stopFreshnessTimer() {
        if (freshnessIntervalId === null) return;
        clearInterval(freshnessIntervalId);
        freshnessIntervalId = null;
    }

    function expireStaleData() {
        const live = window.App?.data?.live;
        const freshness = live?.dataFreshness;
        if (!live || !freshness || freshness.isActive === false) return;

        const lastSeenTime = _parseTimestamp(freshness.lastSeenAt)?.getTime();
        const lastSeenAt = _parseTimestamp(freshness.lastSeenAt);
        const signatureFirstSeenTime = _parseTimestamp(freshness.signatureFirstSeenAt)?.getTime();
        const anchorTime = Number.isFinite(lastSeenTime) ? lastSeenTime : signatureFirstSeenTime;
        if (!Number.isFinite(anchorTime)) return;

        const ageMs = Math.max(0, Date.now() - anchorTime);
        const staleAfterMs = lastSeenAt ? _getTimestampStaleAfterMs(lastSeenAt) : LIVE_DATA_STALE_MS;
        if (ageMs <= staleAfterMs) return;

        live.deviceActive = false;
        live.dataFreshness = {
            ...freshness,
            isActive: false,
            reason: "stale",
            staleSource: freshness.staleSource ?? (Number.isFinite(lastSeenTime) ? "timestamp" : "unchanged_metrics"),
            ageMs
        };

        window.renderApp?.();
    }

    function _pickFirstPresent(values) {
        return values.find((value) => value !== null && value !== undefined && value !== "");
    }

    function _resolveTelemetryOk(values) {
        const present = values.filter((value) => value !== null && value !== undefined && value !== "");
        if (present.some((value) => value === false || String(value).toLowerCase() === "false")) return false;
        if (present.some((value) => value === true || String(value).toLowerCase() === "true")) return true;
        return null;
    }

    function _resolveMetricSignatureFreshness(signature) {
        if (!signature) return null;

        const key = _getMetricSignatureStorageKey();
        if (!key) return null;

        const now = Date.now();
        const stored = _readMetricSignatureState(key);

        if (!stored || stored.signature !== signature || !Number.isFinite(stored.firstSeenAt)) {
            const nextState = { signature, firstSeenAt: now };
            _writeMetricSignatureState(key, nextState);
            return { ...nextState, ageMs: 0 };
        }

        return {
            signature,
            firstSeenAt: stored.firstSeenAt,
            ageMs: Math.max(0, now - stored.firstSeenAt)
        };
    }

    function _getMetricSignatureStorageKey() {
        const plant = window.App?.data?.context?.plant || {};
        const siteId = plant.siteId ?? plant.site_id ?? plant.id;
        if (siteId === undefined || siteId === null || siteId === "") return null;
        return `${LIVE_STORAGE_PREFIX}.${String(siteId)}`;
    }

    function _readMetricSignatureState(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            const firstSeenAt = Number(parsed?.firstSeenAt);
            if (!parsed?.signature || !Number.isFinite(firstSeenAt)) return null;

            return { signature: String(parsed.signature), firstSeenAt };
        } catch {
            return null;
        }
    }

    function _writeMetricSignatureState(key, state) {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch {
            // Storage is best-effort; timestamp-based freshness still works without it.
        }
    }

    function _parseTimestamp(value) {
        if (value === null || value === undefined || value === "") return null;

        const text = String(value).trim();
        const date = new Date(text);
        return Number.isFinite(date.getTime()) ? date : null;
    }

    function _getTimestampStaleAfterMs(date) {
        return date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
            ? LIVE_DATA_STALE_MS + LIVE_BUCKET_GRACE_MS
            : LIVE_DATA_STALE_MS;
    }

    return {
        buildMetricSignature,
        resolveFreshness,
        startFreshnessTimer,
        stopFreshnessTimer,
        expireStaleData
    };
})();
