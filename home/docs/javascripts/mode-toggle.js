// allow user to choose "system preference" via theme toggle

function syncPaletteWithSystemPreference() {
    if (localStorage.getItem("data-md-prefers-color-scheme") === "true") {
        scheme = (window.matchMedia("(prefers-color-scheme: dark)").matches) ? "slate" : "fraunhofer"
        document.querySelector("body").setAttribute("data-md-color-scheme", scheme)
    }
}
syncPaletteWithSystemPreference()

/**
 * Observe system color scheme preference changes and update color palette accordingly.
 */
const systemPreferenceObserver = e => {
    if (localStorage.getItem("data-md-prefers-color-scheme") === "true") {
        document.querySelector("body").setAttribute("data-md-color-scheme", (e.matches) ? "slate" : "fraunhofer")
    }
}
const matchListener = window.matchMedia("(prefers-color-scheme: dark)")
matchListener.addListener(systemPreferenceObserver)

/**
 * Observe palette toggle attribute changes (through user toggling the palette) and update "preferSystemPreference" state accordingly.
 */
const themeToggleObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        var prefers = "false"
        if (mutation.type === 'attributes' && mutation.attributeName === 'hidden' && mutation.target.getAttribute("hidden") === null) {
            console.log("Toggle palette with system preference")
            prefers = "true"
            // update current color scheme according to system preference
        } else {
            prefers = "false"
        }
        localStorage.setItem("data-md-prefers-color-scheme", prefers)
        syncPaletteWithSystemPreference()
    })
})
themeToggleObserver.observe(document.querySelector('label[for="__palette_2"]'), { attributes: true })