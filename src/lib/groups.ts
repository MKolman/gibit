export const levels = ["osnovna", "rekreativna 1", "rekreativna 2", "nadaljevalna"]
export const colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
export function doesGroupMatch(userGroup: string, settingGroup: string) {
    return userGroup.includes(settingGroup) || (settingGroup === "rekreativna 2" && userGroup.includes("rekreativna 1 /2"));
}
export function isGroupSelected(groups: string[], selectedGroups: Set<string>, useLevelsAsGroups: boolean) {
    if (useLevelsAsGroups) {
        for (const g1 of groups) {
            for (const g2 of selectedGroups) {
                if (doesGroupMatch(g1, g2)) {
                    return true;
                }
            }
        }
        return false;
    }
    return groups.some((group) => selectedGroups.has(group));
}

export function extractGroups(data: {groups: string[]}[]): string[] {
    const groups = Array.from(new Set(data.flatMap(d => d.groups)));
    groups.sort((a, b) => {
        let mul = 1;
        for (const level of levels) {
            const aMatch = doesGroupMatch(a, level);
            const bMatch = doesGroupMatch(b, level);
            if (aMatch && !bMatch) {
                return -1 * mul;
            }
            if (!aMatch && bMatch) {
                return 1 * mul;
            }
            if (aMatch && bMatch) {
                mul = -1;
            }
        }
        return a < b ? -1 : 1;
    });

    return groups;
}