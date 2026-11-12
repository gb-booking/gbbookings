/** Towns linked from the footer, each with a page at /place/<town>. The sitemap lists the ones that have listings. */
export const TOWNS = ['Skardu', 'Hunza Valley', 'Gilgit', 'Shigar Valley', 'Deosai Plains', 'Fairy Meadows', 'Naltar Valley', 'Attabad Lake'];

/** What listing locations say: "Karimabad, Hunza", not "Hunza Valley". */
export const townPlace = (town: string) => town.replace(/\s+valley$/i, '').trim();
