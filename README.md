# Unedit and Undelete for Reddit

<p align="left">
  <a href="https://discord.gg/fPrdqh3Zfu">
    <img src="https://img.shields.io/discord/819650821314052106?color=7289DA&logo=discord&logoColor=white" alt="Dev Pro Tips Discussion & Support Server" /></a>
  <a href="https://github.com/DenverCoder1/Unedit-for-Reddit/blob/master/LICENSE">
    <img src="https://custom-icon-badges.herokuapp.com/github/license/DenverCoder1/Unedit-for-Reddit?logo=law" alt="License MIT" /></a>
  <a href="https://github.com/DenverCoder1/Unedit-for-Reddit/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc">
    <img src="https://custom-icon-badges.herokuapp.com/github/issues-raw/DenverCoder1/Unedit-for-Reddit?logo=github" alt="Issues" /></a>
  <a href="https://chrome.google.com/webstore/detail/unedit-and-undelete-for-r/cnpmnmpafbfojcoofaobmhmafiflgmka">
    <img src="https://custom-icon-badges.herokuapp.com/chrome-web-store/v/cnpmnmpafbfojcoofaobmhmafiflgmka?logo=chrome-webstore&label=chrome" alt="Chrome Web Store" /></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/unedit-for-reddit/">
    <img src="https://custom-icon-badges.herokuapp.com/amo/v/unedit-for-reddit?color=FF7139&label=firefox&logo=firefoxpng" alt="Firefox" /></a>
  <a href="https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit">
    <img src="https://custom-icon-badges.herokuapp.com/github/v/release/DenverCoder1/Unedit-for-Reddit?color=000&label=greasyfork&logo=greasyforkpng" alt="Greasyfork" /></a>
</p>

Creates a link next to edited and deleted Reddit comments and submissions to show the original post from before it was edited/removed.

The unedited comment will be displayed inline, right below the current comment or submission's text.

This script is compatible with both Reddit's Redesign and Old Reddit.

The [Pushshift Reddit API](https://github.com/pushshift/api) is used for fetching the comments as they will be archived soon after they have been posted.

## How to use

![instructions](https://user-images.githubusercontent.com/20955511/172483035-90eff88d-4b7d-416a-951d-001c96299476.png)

## Installation

[![Install with Greasy Fork](https://user-images.githubusercontent.com/20955511/172905333-b5815a66-1013-4a1a-a6f2-7b6447aee9c5.png)](https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit)
[![Available in the Chrome Web Store](https://user-images.githubusercontent.com/20955511/172903902-727ce3a9-5a63-44a8-becd-bcc11e954f30.png)](https://chrome.google.com/webstore/detail/unedit-and-undelete-for-r/cnpmnmpafbfojcoofaobmhmafiflgmka)
[![Firefox Get the Add-on](https://user-images.githubusercontent.com/20955511/172904059-eb121557-ef91-43a6-a5f6-f4be5e20a5dc.png)](https://addons.mozilla.org/en-US/firefox/addon/unedit-for-reddit/)

### As a Userscript

This script can be installed to most browsers using userscript browser extensions such as [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://www.tampermonkey.net/), among others using the green button on [Greasy Fork](https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit).

Alternatively, you may copy the contents of [`script.js`](https://github.com/DenverCoder1/Unedit-for-Reddit/blob/master/script.js) into a new script using any userscript browser extension.

### As a Chrome Extension

Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/unedit-and-undelete-for-r/cnpmnmpafbfojcoofaobmhmafiflgmka), or alternatively, download or clone this repository, enable "Developer mode" at <chrome://extensions/>, and load the folder unpacked.

### As a Firefox Addon

Install from [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/unedit-for-reddit/), or alternatively, follow these steps to build and install from the source:

To sign the extension for use in Firefox, you will need credentials from https://addons.mozilla.org/en-US/developers/addon/api/key/. The generated extension will appear as a `.xpi` file in `./web-ext-artifacts`. This file can be opened in Firefox to install the add-on.

```bash
# Install the web-ext CLI
npm install -g web-ext
# web-ext only supports manifest v2 as of now
mv manifest.json manifest-v3.json && mv manifest-v2.json manifest.json
# Sign and generate the add-on using credentials
web-ext sign --api-key=user:YOUR_USER_ID --api-secret=YOUR_SECRET
```

## Known issues

The following are known limitations that cannot be fixed:

-   The fetched comment may occasionally be the edited version instead of the original. This is because the Pushshift archive may take more time to archive the comment than it took the user to edit the comment, therefore causing Pushshift to archive the edited version and not the original. Additionally, comments that are several years old may also show the edited version since the original versions of comments edited before the first archival will not appear in Pushshift.
-   Comments that were posted within the past few minutes may occasionally not be found since Pushshift can take some time to archive all comments.
-   Comments in private subreddits will not be found as they are not able to be archived by Pushshift.
-   Comments deleted by Reddit's spam filter will not be found as the text is never available for Pushshift to archive.

## Changelog

### Changes in 3.8.0

-   Added support for viewing deleted and moderator-removed submissions on Redesign and Old Reddit
-   Added support for viewing edited submissions in list views (Old Reddit only)
-   Better error handling and logging
-   Changed background and foreground color of original posts to be consistent across all posts and themes

### Changes in 3.7.3

-   Fix duplicate "Show original" links appearing inside deleted comments

### Changes in 3.7.2

-   Prevent "show original" links from appearing twice on comments that are both edited and deleted
-   Expand comment when the "show original" link is clicked on a collapsed comment (Old Reddit only)
-   Some minor code refactoring and formatting

### Changes in 3.7.1

-   Fixed positioning of original comment on Old Reddit to be inline with text rather than below replies

### Changes in 3.7.0

-   Added support for viewing comments removed by moderators

### Changes in 3.6.1

-   Better error handling
-   More reliable when viewing edited comments on profile pages

### Changes in 3.6.0

-   Check a second source for comments so more recent comments are less likely to be "not found"
-   Fixes to getting comment ids in Reddit redesign

### Changes in 3.5

-   Added compatibility with Old Reddit links without "old.reddit" in the URL
-   Added additional @includes for more compatibility

### Changes in 3.4

-   Fixed @match for more compatibility

### Changes in 3.3

-   Added support for profile pages (Redesign)

### Changes in 3.2

-   Works more accurately in post previews (Redesign feature where the post is shown in a popup when clicked from post list)

### Changes in 3.1

-   Fixed missing styling on comments shown in the Redesign
-   Fixed placement of inline comment to work on comments that do not end with a paragraph (`<p>`) element

### Changes in 3.0

-   Added support for deleted comments

### Changes in 2.0

-   The original comment is converted from markdown to HTML to show custom formatting
-   Support for self-text submissions (old Reddit only)
