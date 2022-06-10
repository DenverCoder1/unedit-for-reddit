// ==UserScript==
// @name         Unedit and Undelete for Reddit
// @namespace    http://tampermonkey.net/
// @version      3.7.3
// @description  Creates the option next to edited and deleted Reddit comments/posts to show the original comment from before it was edited
// @author       Jonah Lawrence (DenverCoder1)
// @match        *://*reddit.com/*
// @include      https://*.reddit.com/*
// @include      https://reddit.com/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js
// @license      MIT
// ==/UserScript==

/* jshint esversion: 8 */

(function () {
    "use strict";

    /**
     * Whether or not we are on old reddit and not redesign.
     * This will be set in the "load" event listener.
     * @type {boolean}
     */
    var isOldReddit = false;

    /**
     * Timeout to check for new edited comments on page.
     * This will be updated when scrolling.
     * @type {number}
     */
    var scriptTimeout = null;

    /**
     * The element that is currently requesting content
     * @type {Element}
     */
    var currentLoading;

    /**
     * Showdown markdown converter
     * @type {showdown.Converter}
     */
    var mdConverter = new showdown.Converter();

    /**
     * Find the ID of a comment or submission.
     * @param {Element} innerEl An element inside the comment.
     * @returns {string} The Reddit ID of the comment.
     */
    function getPostId(innerEl) {
        var postId = "";
        try {
            // redesign
            if (!isOldReddit) {
                var post = innerEl?.closest("[class*='t1_'], [class*='t3_']");
                postId = Array.from(post.classList).filter(function (el) {
                    return el.indexOf("t1_") > -1 || el.indexOf("t3_") > -1;
                })[0];
            }
            // old reddit
            else {
                postId = innerEl.parentElement.parentElement.parentElement.id;
                // old reddit submission
                if (postId === "" && isInSubmission(innerEl)) {
                    postId = window.location.href.match(/comments\/([A-Za-z0-9]{5,8})\//)[1];
                }
                // old reddit comment
                else {
                    postId = postId.split("_").slice(1).join("_");
                }
                // if still not found, check the .reportform element
                if (postId === "") {
                    postId = innerEl.parentElement.parentElement
                        .getElementsByClassName("reportform")[0]
                        .className.replace(/.*t1/, "t1");
                }
            }
        } catch (error) {
            return null;
        }
        return postId;
    }

    /**
     * Get the container of the comment or submission body for appending the original comment to.
     * @param {string} postId The ID of the comment or submission
     * @returns {Element} The container element of the comment or submission body.
     */
    function getPostBodyElement(postId) {
        var bodyEl = null,
            baseEl = null;
        // redesign
        if (!isOldReddit) {
            baseEl = document.querySelector(`#${postId}, .Comment.${postId}`);
            if (baseEl) {
                if (baseEl.getElementsByClassName("RichTextJSON-root").length > 0) {
                    bodyEl = baseEl.getElementsByClassName("RichTextJSON-root")[0];
                } else if (isInSubmission(baseEl) && baseEl?.firstElementChild?.lastElementChild) {
                    bodyEl = baseEl.firstElementChild.lastElementChild;
                } else {
                    bodyEl = baseEl;
                }
            }
        }
        // old reddit
        else {
            // old reddit comments
            baseEl = document.querySelector(`form[id*='${postId}'] .md`);
            if (baseEl?.closest(".entry")) {
                bodyEl = baseEl;
            } else {
                baseEl = document.querySelector(".report-" + postId);
                bodyEl = baseEl ? baseEl.closest(".entry").querySelector(".usertext") : null;
            }
            // old reddit submissions
            if (!bodyEl) {
                bodyEl =
                    document.querySelector("#siteTable .entry form .md") ||
                    document.querySelector("#siteTable .entry form .usertext-body");
            }
        }
        return bodyEl;
    }

    /**
     * Check if surrounding elements imply element is in a selftext submission.
     * @param {Element} innerEl An element inside the post to check.
     * @returns {boolean} Whether or not the element is in a selftext submission
     */
    function isInSubmission(innerEl) {
        return Boolean(innerEl.closest("#siteTable, .Post"));
    }

    /**
     * Check if the element bounds are within the window bounds.
     * @param {Element} element The element to check
     * @returns {boolean} Whether or not the element is within the window
     */
    function isInViewport(element) {
        var rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Create a new paragraph containing the body of the original comment/post.
     * @param {Element} commentBodyElement The container element of the comment/post body.
     * @param {string} postType The type of post - "comment" or "post" (submission)
     * @param {string} originalBody The body of the original comment/post.
     */
    function showOriginalComment(commentBodyElement, postType, originalBody) {
        // create paragraph element
        var origBody = document.createElement("p");
        origBody.className = "og";
        // set text
        origBody.innerHTML = mdConverter.makeHtml("\n\n### Original " + postType + ":\n\n" + originalBody);
        // paragraph styling
        origBody.style.opacity = 0.96;
        origBody.style.fontSize = "14px";
        origBody.style.background = "#ffed4c5c";
        origBody.style.padding = "16px";
        origBody.style.color = "inherit";
        origBody.style.lineHeight = "20px";
        commentBodyElement.appendChild(origBody);
        // scroll into view
        setTimeout(function () {
            if (!isInViewport(origBody)) {
                origBody.scrollIntoView({ behavior: "smooth" });
            }
        }, 500);
        // on old reddit, if the comment is collapsed, expand it so the original comment is visible
        if (isOldReddit) {
            expandComment(commentBodyElement);
        }
    }

    /**
     * Expand comment if it is collapsed (on old reddit only).
     * @param {Element} innerEl An element inside the comment.
     */
    function expandComment(innerEl) {
        var collapsedComment = innerEl.closest(".collapsed");
        if (collapsedComment) {
            collapsedComment.classList.remove("collapsed");
            collapsedComment.classList.add("noncollapsed");
        }
    }

    /**
     * Create a link to view the original comment/post.
     * @param {Element} innerEl An element inside the comment or post to create a link for.
     */
    function createLink(innerEl) {
        // if there is already a link, don't create another
        if (innerEl.parentElement.querySelector("a.showOriginal")) {
            return;
        }
        // create link to "Show orginal"
        var showLinkEl = document.createElement("a");
        showLinkEl.innerText = "Show original";
        showLinkEl.className = innerEl.className + " showOriginal";
        showLinkEl.style.textDecoration = "underline";
        showLinkEl.style.cursor = "pointer";
        showLinkEl.style.marginLeft = "6px";
        innerEl.parentElement.appendChild(showLinkEl);
        innerEl.className += " found";
        // click event
        showLinkEl.addEventListener(
            "click",
            async function () {
                // allow only 1 request at a time
                if (typeof currentLoading != "undefined" && currentLoading !== null) {
                    return;
                }
                // find id of selected comment
                var postId = getPostId(this);
                // create url for getting comment/post from pushshift api
                var idURL = isInSubmission(this)
                    ? "https://api.pushshift.io/reddit/search/submission/?ids=" +
                      postId +
                      "&sort=desc&sort_type=created_utc&fields=selftext,author,id"
                    : "https://api.pushshift.io/reddit/search/comment/?ids=" +
                      postId +
                      "&sort=desc&sort_type=created_utc&fields=body,author,id,link_id";
                // create url for getting author comments/posts from pushshift api
                var author = this.parentElement.querySelector("a[href*=user]")?.innerText;
                var authorURL = isInSubmission(this)
                    ? "https://api.pushshift.io/reddit/search/submission/?author=" +
                      author +
                      "&size=200&sort=desc&sort_type=created_utc&fields=selftext,author,id"
                    : "https://api.pushshift.io/reddit/search/comment/?author=" +
                      author +
                      "&size=200&sort=desc&sort_type=created_utc&fields=body,author,id,link_id";

                // set loading status
                currentLoading = this;
                this.innerHTML = "loading...";

                console.info("Fetching from " + idURL + " and " + authorURL);

                // request from pushshift api
                await Promise.all([
                    fetch(idURL)
                        .then((resp) => resp.json())
                        .catch((error) => {
                            console.error("Error:", error);
                        }),
                    fetch(authorURL)
                        .then((resp) => resp.json())
                        .catch((error) => {
                            console.error("Error:", error);
                        }),
                ])
                    .then((responses) => {
                        responses.forEach((out) => {
                            // locate the comment that was being loaded
                            var loading = currentLoading;
                            // exit if already found
                            if (loading.innerHTML === "") {
                                return;
                            }
                            // locate comment body
                            var commentBodyElement = getPostBodyElement(postId);
                            var post = out?.data?.find((p) => p?.id === postId?.split("_").pop());
                            console.info("Response", { author, id: postId, post, data: out?.data });
                            // check that comment was fetched and body element exists
                            if (commentBodyElement && post?.body) {
                                // create new paragraph containing the body of the original comment
                                showOriginalComment(commentBodyElement, "comment", post.body);
                                // remove loading status from comment
                                loading.innerHTML = "";
                            } else if (commentBodyElement && post?.selftext) {
                                // check if result has selftext instead of body (it is a submission post)
                                // create new paragraph containing the selftext of the original submission
                                showOriginalComment(commentBodyElement, "post", post.selftext);
                                // remove loading status from post
                                loading.innerHTML = "";
                            } else if (out?.data?.length === 0) {
                                // data was not returned or returned empty
                                loading.innerHTML = "not found";
                                console.error("Not found:", out);
                            } else {
                                // other issue occurred with displaying comment
                                loading.innerHTML = "fetch failed";
                                console.error("Fetch failed:", out);
                            }
                        });
                    })
                    .catch(function (err) {
                        throw err;
                    });

                // reset status
                currentLoading = null;
            },
            false
        );
    }

    /**
     * Locate comments and add links to each.
     */
    function findEditedComments() {
        // when function runs, cancel timeout
        if (scriptTimeout) {
            scriptTimeout = null;
        }
        // list elements to check for edited or deleted status
        var selectors = [],
            elementsToCheck = [],
            editedComments = [];
        // redesign
        if (!isOldReddit) {
            selectors = [
                ".Comment div:first-of-type span span:not(.found)", // Comments "edited..." or "Comment deleted/removed..."
                ".Post div div div:last-of-type div ~ div:last-of-type:not(.found)", // Submissions "It doesn't appear in any feeds..." message
            ];
            elementsToCheck = Array.from(document.querySelectorAll(selectors.join(", ")));
            editedComments = elementsToCheck.filter(function (el) {
                return (
                    el.innerText.substring(0, 6) === "edited" || // include edited comments
                    el.innerText.substring(0, 15) === "Comment deleted" || // include comments deleted by user
                    el.innerText.substring(0, 15) === "Comment removed" || // include comments removed by moderator
                    el.innerText.substring(0, 30) === "It doesn't appear in any feeds" || // include deleted submissions
                    el.innerText.substring(0, 23) == "Moderators remove posts" // include submissions removed by moderators
                );
            });
        }
        // old Reddit
        else {
            selectors = [
                ".entry p.tagline time:not(.found)", // Comment or Submission "last edited" timestamp
                ".entry p.tagline em:not(.found)", // Comment "[deleted]" author
                "#siteTable p.tagline span:first-of-type:not(.found)", // Submission "[deleted]" author
                "#siteTable .usertext-body em:not(.found)", // Submission "[removed]" body
            ];
            elementsToCheck = Array.from(document.querySelectorAll(selectors.join(", ")));
            editedComments = elementsToCheck.filter(function (el) {
                return (
                    el.title.substring(0, 11) === "last edited" || // include edited comments or submissions
                    el.innerText === "[deleted]" || // include comments or submissions deleted by user
                    el.innerText === "[removed]" // include comments or submissions removed by moderator
                );
            });
        }
        // create links
        editedComments.forEach(function (x) {
            createLink(x);
        });
    }

    // check for new comments when you scroll
    window.addEventListener(
        "scroll",
        function () {
            if (!scriptTimeout) {
                scriptTimeout = setTimeout(findEditedComments, 1000);
            }
        },
        true
    );

    // add additional styling, find edited comments, and set old reddit status on page load
    window.addEventListener("load", function () {
        // determine if reddit is old or redesign
        isOldReddit = /old\.reddit/.test(window.location.href) || !!document.querySelector("#header-img");
        // fix styling of created paragraphs in new reddit
        if (!isOldReddit) {
            document.head.insertAdjacentHTML(
                "beforeend",
                "<style>p.og pre { font-family: monospace; background: #ffffff50; padding: 6px; margin: 6px 0; } p.og h1 { font-size: 2em; } p.og h2 { font-size: 1.5em; } p.og h3 { font-size: 1.17em; } p.og h4 { font-size: 1em; } p.og h5 { font-size: 0.83em; } p.og h6 { font-size: 0.67em; } p.og a { color: lightblue; text-decoration: underline; }</style>"
            );
        }
        // find edited comments
        findEditedComments();
    });
})();
