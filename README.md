# Helinite [WIP]

This project is inspired by [Perlite](https://github.com/secure-77/Perlite).

This project is fully vibe coding from scratch (only based on `Perlite` repo)

## Required Obsidian Settings (unchecked)

> Copied from [Perlite Wiki](https://github.com/secure-77/Perlite/wiki/03---Perlite-Settings#required-settings)
> Meta Extrator plugin necessary?? metadata.json

### Internal links

You need to set `Files & Links` in the options from `Shortest path when possible` to `Relative path to file`

> ⚠️ This options only applies for new created links, so you need to fix already existing links in your files. Obsidian can automatically update internal links in your vault when you rename or move a file.

### Fix already created links

You can use the [obsidian-link-converter plugin](https://github.com/ozntel/obsidian-link-converter) for this. After installation, change the "Converted Link Format" to "Relative Path" or "Absolute Path" in the Plugin options

Then go to the command palette and search for `vault:` and select convert all "Links to Markdown". Confirm the Messagebox and do the same again but this time select "Links to Wiki", this way you can force the plugin to update all your links to the correct format.

If you only want to convert Links in specific files you can use the context menu on you markdown file and choose "All Links to Relative Path | Absolute Path"

### Wikilinks

for internal links (like to other files or images) only Wikilinks are supported, so make sure that you have turned this option on (default)