/**
 * Shared helpers for the Lex Arcana ApplicationV2 sheets (Foundry v13+).
 */

/** Escape a string for safe inclusion in HTML */
export function escapeHTML(value)
{
    return foundry.utils.escapeHTML(String(value ?? ''));
}

/** The TextEditor implementation (namespaced since Foundry v13) */
export function getTextEditor()
{
    return foundry.applications.ux.TextEditor.implementation;
}

/**
 * Mixin adding common behaviors to document sheets:
 * - simple tab handling which remembers the active tab across re-renders
 * - rich text enrichment
 * @param {typeof foundry.applications.api.DocumentSheetV2} Base
 */
export function LexArcanaSheetMixin(Base)
{
    return class LexArcanaSheet extends Base
    {
        /** Active tab of each tab group */
        tabGroups = {};

        /**
         * Enrich an HTML string for display in a toggled <prose-mirror> editor
         * @param {string} content
         */
        async _enrich(content)
        {
            return getTextEditor().enrichHTML(content ?? '', {
                secrets: this.document.isOwner,
                relativeTo: this.document,
                rollData: this.document.getRollData?.() ?? {}
            });
        }

        /** @override */
        async _onRender(context, options)
        {
            await super._onRender(context, options);
            this._activateTabs();
        }

        /**
         * Restore (or initialize) the active tab of each tab group present in the rendered HTML.
         */
        _activateTabs()
        {
            const navs = this.element.querySelectorAll('.tabs[data-group]');
            for (const nav of navs)
            {
                const group = nav.dataset.group;
                const links = nav.querySelectorAll('[data-tab]');
                if (!links.length) continue;
                for (const link of links)
                {
                    link.dataset.group ??= group;
                    link.dataset.action ??= 'tab';
                }
                const wanted = this.tabGroups[group];
                const exists = wanted && nav.querySelector(`[data-tab="${wanted}"]`);
                const tab = exists ? wanted : links[0].dataset.tab;
                this.tabGroups[group] = null;
                this.changeTab(tab, group, {force: true, updatePosition: false});
            }
        }
    };
}
