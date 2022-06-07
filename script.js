// ==UserScript==
// @name         Unedit and Undelete for Reddit
// @namespace    http://tampermonkey.net/
// @version      3.7.2
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
                var comment = innerEl?.closest(".Comment") || innerEl?.closest("[class*=t1_]");
                postId = Array.from(comment.classList).filter(function (el) {
                    return el.indexOf("_") > -1;
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
        var bodyEl = null;
        try {
            // redesign
            if (!isOldReddit) {
                var baseEl = document.getElementById(postId);
                if (baseEl) {
                    if (baseEl.getElementsByClassName("RichTextJSON-root").length > 0)
                        bodyEl = baseEl.getElementsByClassName("RichTextJSON-root")[0];
                    else bodyEl = baseEl;
                }
                baseEl = document.querySelector(".Comment." + postId);
                if (!bodyEl && baseEl) {
                    if (baseEl.getElementsByClassName("RichTextJSON-root").length > 0)
                        bodyEl = baseEl.getElementsByClassName("RichTextJSON-root")[0];
                    else bodyEl = baseEl.firstElementChild.lastElementChild;
                }
            }
            // old reddit
            else {
                if (document.querySelector("form[id*=" + postId + "] div.md")) {
                    bodyEl = document.querySelector("form[id*=" + postId + "] div.md");
                }
                if (!bodyEl) {
                    // comment container
                    bodyEl = document.querySelector(".report-" + postId).parentElement.parentElement;
                    // if usertext available, use that instead
                    if (bodyEl.querySelector(".usertext")) {
                        bodyEl = bodyEl.querySelector(".usertext");
                    }
                }
            }
        } catch (error) {
            return null;
        }
        return bodyEl;
    }

    /**
     * Check if surrounding elements imply element is in a selftext submission.
     * @param {Element} innerEl An element inside the post to check.
     * @returns {boolean} Whether or not the element is in a selftext submission
     */
    function isInSubmission(innerEl) {
        return innerEl.parentElement.parentElement.className == "top-matter";
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
                            console.log({ author, id: postId, post });
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
                                console.log("id: " + postId);
                                console.log(out);
                            } else {
                                // other issue occurred with displaying comment
                                loading.innerHTML = "fetch failed";
                                console.log("id: " + postId);
                                console.log(out);
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
        // list of elements to check for edited or deleted status
        var elementsToCheck = [];
        // list of comments which have been edited
        var editedComments = [];
        // redesign
        if (!isOldReddit) {
            elementsToCheck = Array.from(document.querySelectorAll(".Comment div span:not(.found)"));
            editedComments = elementsToCheck.filter(function (el) {
                return (
                    el.innerText.substring(0, 6) == "edited" || // include edited comments
                    el.innerText.substring(0, 15) == "Comment deleted" || // include comments deleted by user
                    el.innerText.substring(0, 15) == "Comment removed" // include comments removed by moderator
                );
            });
        }
        // old Reddit
        else {
            elementsToCheck = Array.from(document.querySelectorAll("time:not(.found), em:not(.found)"));
            editedComments = elementsToCheck.filter(function (el) {
                return (
                    el.title.substring(0, 11) == "last edited" || // include edited comments
                    el.innerText === "[deleted]" // include comments deleted by user or moderator
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
