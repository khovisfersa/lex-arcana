/* -------------------------------------------- */
/*                  Tools                       */
/* -------------------------------------------- */

const PHYSICAL_ITEM_TYPES = ['meleeWeapon', 'rangedWeapon', 'shield', 'armor'];

export class LexArcanaUtils
{
	static ObjectToArray(obj)
	{
		if (Array.isArray(obj)) return obj;
		return Object.values(obj ?? {});
	}

	/**
	 * List the distinct item classes of the world items (and of the given actor's items)
	 * @param {Actor} [actor]
	 * @returns {string[]}
	 */
	static getItemClasses(actor = null)
	{
		const itemClasses = new Set();
		const sources = [game.items?.contents ?? [], actor?.items?.contents ?? []];
		for (const items of sources)
		{
			for (const _item of items)
			{
				if (_item.system?.class && PHYSICAL_ITEM_TYPES.includes(_item.type))
				{
					itemClasses.add(_item.system.class);
				}
			}
		}
		return Array.from(itemClasses);
	}
};
