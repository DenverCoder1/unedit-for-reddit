# Unedit and Undelete for Reddit

<p align="left">
  <a href="https://discord.gg/fPrdqh3Zfu">
    <img src="https://img.shields.io/discord/819650821314052106?color=7289DA&logo=discord&logoColor=white" alt="Dev Pro Tips Discussion & Support Server" /></a>
  <a href="https://github.com/DenverCoder1/Unedit-for-Reddit">
    <img src="https://custom-icon-badges.herokuapp.com/github/stars/DenverCoder1/Unedit-for-Reddit?logo=star" alt="Stars" /></a>
  <a href="https://github.com/DenverCoder1/Unedit-for-Reddit/blob/master/LICENSE">
    <img src="https://custom-icon-badges.herokuapp.com/github/license/DenverCoder1/Unedit-for-Reddit?logo=law" alt="License MIT" /></a>
  <a href="https://github.com/DenverCoder1/Unedit-for-Reddit/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc">
    <img src="https://custom-icon-badges.herokuapp.com/github/issues-raw/DenverCoder1/Unedit-for-Reddit?logo=issue" alt="Issues" /></a>
</p>

Creates a link next to edited and deleted Reddit comments and submissions to show the original post from before it was edited/removed. The unedited comment is displayed inline. This script is compatible with the Redesign and Old Reddit.

This script makes use of the [Pushshift Reddit API](https://github.com/pushshift/api).

## Example usage

![Show Original](https://i.imgur.com/aubQhBL.png)

![Shown](https://i.imgur.com/kPlXd6w.png)

## Installation

This script can be installed to most userscript browser extensions such as [Violentmonkey](https://violentmonkey.github.io/), [Tampermonkey](https://www.tampermonkey.net/), and others using the green button on the [Greasy Fork](https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit) page.

[![Download this userscript on Greasy Fork](https://custom-icon-badges.herokuapp.com/badge/-Install%20on%20Greasy%20Fork-000?style=for-the-badge&logo=greasyforkpng)](https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit)

Alternatively, you may copy the contents of [`script.js`](https://github.com/DenverCoder1/Unedit-for-Reddit/blob/master/script.js) into a new script using any userscript browser extension.

## Changelog

### Changes in 3.7.1

* Fixed positioning of original comment on old reddit to be inline with text rather than below replies

### Changes in 3.7.0

* Added support for viewing comments removed by moderators

### Changes in 3.6.1

* Better error handling
* More reliable when viewing edited comments on profile page

### Changes in 3.6.0

* Check a second source for comments so more recent comments are less likely to be "not found"
* Fixes to getting comment ids in Reddit redesign

### Changes in 3.5

* Added compatibility with Old Reddit links without "old.reddit" in the URL
* Added additional @includes for more compatibility

### Changes in 3.4

* Fixed @match for more compatibility

### Changes in 3.3

* Added support for profile pages (Redesign)

### Changes in 3.2

* Works more accurately in post previews (Redesign feature where the post is shown in a popup when clicked from post list)

### Changes in 3.1

* Fixed missing styling on comments shown in the Redesign
* Fixed placement of inline comment to work on comments that do not end with a paragraph (`<p>`) element

### Changes in 3.0

* Added support for deleted comments

### Changes in 2.0

* Original comment is converted from markdown to HTML to show custom formatting.
* Unedit now supports self-text submissions (old Reddit only)
