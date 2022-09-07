<p align="center"><img src="https://raw.githubusercontent.com/DenverCoder1/Unedit-for-Reddit/3.9.4/images/logo128.png" /></center>

<h1 align="center">Unedit and Undelete for Reddit</h1>

<p align="center">
  <a href="https://discord.gg/fPrdqh3Zfu">
    <img src="https://img.shields.io/discord/819650821314052106?color=7289DA&logo=discord&logoColor=white" alt="Dev Pro Tips Discussion & Support Server" /></a>
  <a href="https://github.com/DenverCoder1/Unedit-for-Reddit/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc">
    <img src="https://custom-icon-badges.herokuapp.com/github/issues-raw/DenverCoder1/Unedit-for-Reddit?logo=github" alt="Issues" /></a>
  <a href="https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit">
    <img src="https://custom-icon-badges.herokuapp.com/badge/dynamic/json?color=000&label=greasy+fork&query=%24.message&url=https://img.shields.io/greasyfork/dt/407466.json&logo=greasyforkpng&suffix=%20users" alt="Greasy Fork users" /></a>
  <a href="https://chrome.google.com/webstore/detail/unedit-and-undelete-for-r/cnpmnmpafbfojcoofaobmhmafiflgmka">
    <img src="https://custom-icon-badges.herokuapp.com/badge/dynamic/json?color=blue&label=chrome+web+store&query=%24.message&url=https://img.shields.io/chrome-web-store/users/cnpmnmpafbfojcoofaobmhmafiflgmka.json&logo=chrome-webstore&suffix=%20users" alt="Chrome Web Store users" /></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/unedit-for-reddit/">
    <img src="https://custom-icon-badges.herokuapp.com/badge/dynamic/json?color=FF7139&label=firefox+add-on&query=%24.message&url=https://img.shields.io/amo/users/unedit-for-reddit.json&logo=firefoxpng&suffix=%20users" alt="Firefox users" /></a>
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

This script can be installed on most browsers using userscript browser extensions such as [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://www.tampermonkey.net/), among others using the green button on [Greasy Fork](https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit).

Alternatively, you may copy the contents of [`script.js`](https://github.com/DenverCoder1/Unedit-for-Reddit/blob/master/script.js) into a new script using any userscript browser extension.

### As a Chrome Extension

Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/unedit-and-undelete-for-r/cnpmnmpafbfojcoofaobmhmafiflgmka), or alternatively, download or clone this repository, enable "Developer mode" at <chrome://extensions/>, and load the folder unpacked.

### As a Firefox Addon

Install from [Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/unedit-for-reddit/), or alternatively, follow these steps to build and install from the source:

To sign the extension for use in Firefox, you will need credentials from https://addons.mozilla.org/en-US/developers/addon/api/key/. Create a copy of `.env.example` named `.env` and replace the placeholders with your API key and secret. Install `web-ext` with `npm install -g web-ext` and sign the extension with `make sign-firefox`. The generated extension will appear as a `.xpi` file in `./web-ext-artifacts`. This file can be opened in Firefox to install the add-on.

## Known issues

The following are known limitations that cannot be fixed:

-   The fetched comment may occasionally be the edited version instead of the original. This is because the Pushshift archive may take more time to archive the comment than it took the user to edit the comment, therefore causing Pushshift to archive the edited version and not the original. Additionally, comments that are several years old may also show the edited version since the original versions of comments edited before the first archival will not appear in Pushshift.
-   Comments that were posted within the past few minutes may occasionally not be found since Pushshift can take some time to archive all comments.
-   Comments in private subreddits will not be found as they are not able to be archived by Pushshift.
-   Comments deleted by Reddit's spam filter will not be found as the text is never available for Pushshift to archive.

## Changelog

### Changes in 3.15.0

-   Added support for comments not shown in the comment tree if the link is visited directly.

### Changes in 3.14.0

-   Added support for `[unavailable]` comments and submissions (occurs when the user has been blocked by the author).

### Changes in 3.13.0

-   Added support for Classic view and Compact view on Reddit Redesign.
-   Adjusted the font size of links on the search results page to be smaller (Reddit Redesign).

### Changes in 3.12.1

-   Hide link on edited submissions in Classic View since it does not display well (Reddit Redesign)

### Changes in 3.12.0

-   Added support to show the author of posts that were not edited but the author no longer exists
-   Added support for edited submissions on comment context pages
-   Ensure the original post fills the available space on Reddit Redesign

### Changes in 3.11.0

-   Fix markdown conversion to include strikethrough, Github-style code blocks, indented sublists without 4 spaces, and underscores in the middle of a word
-   Added links wherever username and subreddit mentions appear in the original post
-   Added support for hiding spoiler text in the original post
-   Added support for superscripts using `^` in the original post
-   Fixed the search results page on Reddit Redesign to only show the link once
-   Fixed fetching edited submissions sometimes failing

### Changes in 3.10.0

-   Added color overrides for compatibility with RES Night Mode and more custom CSS themes on Old Reddit
-   Added extra spacing around paragraphs and headings in the original comment
-   Improved styling of code blocks in the original comment on Reddit Redesign
-   Added support for displaying tables in the original comment

### Changes in 3.9.5

-   Updated @​match for better compatibility

### Changes in 3.9.4

-   Added the author and created time at the bottom of the original comment. This helps to find out who posted a deleted comment.
-   Fix showing of empty self-text of a post when it was empty and then edited to have text
-   Updates to the color of links in the original post on Redesign to be easier to read
-   Prevents the original post from being displayed more than once if "show original" links are clicked multiple times

### Changes in 3.9.3

-   Fix bug where the submission edited time appears more than once

### Changes in 3.9.2

-   Fixed edited submissions when not using Reddit Enhancement Suite (RES is not a requirement)

### Changes in 3.9.1

-   Support edited submissions in Firefox by using regex instead of `URLPattern`

### Changes in 3.9.0

-   Support for edited submissions on Reddit Redesign on submission pages, list view, and popup view
-   Displays how long ago submissions were edited on Redesign since Reddit doesn't display this information
-   Minor code refactoring and added comments

### Changes in 3.8.0

-   Added support for viewing deleted and moderator-removed submissions on Redesign and Old Reddit
-   Added support for viewing edited submissions in list views (Old Reddit only)
-   Better error handling and logging
-   Changed background and foreground color of original posts to be consistent across all posts and themes
-   Made "Original Post" heading bold on Redesign for consistency

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
-   Added additional @​includes for more compatibility

### Changes in 3.4

-   Fixed @​match for more compatibility

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
