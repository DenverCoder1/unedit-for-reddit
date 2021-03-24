# Unedit and Undelete for Reddit

Creates a link next to edited and deleted Reddit comments and submissions to show the original post from before it was edited/removed. The unedited comment is displayed inline. This script is compatible with the Redesign and Old Reddit.

This script makes use of the [Pushshift Reddit API](https://github.com/pushshift/api).

[Download this userscript on Greasy Fork](https://greasyfork.org/en/scripts/407466-unedit-and-undelete-for-reddit).

### Example usage:

![Show Original](https://i.imgur.com/aubQhBL.png)

![Shown](https://i.imgur.com/kPlXd6w.png)

----

### Changes in 3.5

* Added compatibility with Old Reddit links without "old.reddit" in the URL

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
