class UrlGetterSetter<T> {
    name: string
    defaultValue: T
    lastValue: T
    parse: (value: string) => T|null
    render: (value: T) => string

    constructor(name: string, defaultValue: T) {
        this.name = name
        this.defaultValue = defaultValue
        this.lastValue = defaultValue
        switch (typeof defaultValue) {
            case "boolean":
                this.parse = (value: string) => value === "0" ? false : value === "1" ? true : null as any
                this.render = (value: T) => value?"1":"0"
                break
            case "number":
                this.parse = (value: string) => value.length === 1 && value[0] >= '0' && value[0] <= '3'?+value:null as any
                this.render = (value: T) => value?.toString() || ""
                break
            default:
                throw new Error("unsupported type")
        }
    }
    get(search: URLSearchParams): T {
        const val = search.get(this.name)
        if (val === null) return this.defaultValue
        const parsed = this.parse(val)
        if (parsed === null) return this.defaultValue
        return parsed
    }

    set(search: URLSearchParams, val: T) {
        if (val === this.lastValue) return
        this.lastValue = val
        if (val !== this.defaultValue) {
            search.set(this.name, this.render(val))
        } else if (search.has(this.name)) {
            search.delete(this.name)
        }
        history.pushState(undefined, "", "?"+search.toString())
    }
}
export const tab = new UrlGetterSetter<number>("tab", 0)
export const useBojanScore = new UrlGetterSetter<boolean>("bojanScore", true)
export const useRelativeScore = new UrlGetterSetter<boolean>("relativeScore", false)
export const useLevelsAsGroups = new UrlGetterSetter<boolean>("levels", true)
