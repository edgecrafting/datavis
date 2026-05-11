// Stats computation config — owned by this module, mutated only via setStatsConfig.
// Pure stats code reads from here so it doesn't touch browser globals (localStorage).

const config = {
    useSampleVariance: true, // N-1 denominator (Bessel's correction)
};

export function getStatsConfig() {
    return config;
}

export function setStatsConfig(patch) {
    Object.assign(config, patch);
}
