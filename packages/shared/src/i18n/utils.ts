export const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
    return Object.keys(obj).reduce((acc: any, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
};

export const unflattenObject = (data: Record<string, any>): any => {
    const result: any = {};
    for (const i in data) {
        const keys = i.split('.');
        keys.reduce((r, e, j) => {
            return r[e] || (r[e] = keys.length - 1 === j ? data[i] : {});
        }, result);
    }
    return result;
};

// Deep merge helper - non-mutating
export const deepMerge = (target: any, source: any): any => {
    if (!source) return target;
    if (!target) return JSON.parse(JSON.stringify(source));

    const output = { ...target };
    if (source instanceof Object && target instanceof Object) {
        Object.keys(source).forEach(key => {
            if (source[key] instanceof Object && key in target) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
};
