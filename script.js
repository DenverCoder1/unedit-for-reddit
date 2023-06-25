// ==UserScript==
// @name         Unedit and Undelete for Reddit
// @namespace    http://tampermonkey.net/
// @version      3.17.3
// @description  Creates the option next to edited and deleted Reddit comments/posts to show the original comment from before it was edited
// @author       Jonah Lawrence (DenverCoder1)
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/showdown@2.1.0/dist/showdown.min.js
// @license      MIT
// @icon         https://raw.githubusercontent.com/DenverCoder1/unedit-for-reddit/master/images/logo512.png
// @match        https://*.reddit.com/
// @match        https://*.reddit.com/me/f/*
// @match        https://*.reddit.com/message/*
// @match        https://*.reddit.com/r/*
// @match        https://*.reddit.com/user/*
// @exclude      https://*.reddit.com/*/about/banned*
// @exclude      https://*.reddit.com/*/about/contributors*
// @exclude      https://*.reddit.com/*/about/edit*
// @exclude      https://*.reddit.com/*/about/flair*
// @exclude      https://*.reddit.com/*/about/log*
// @exclude      https://*.reddit.com/*/about/moderators*
// @exclude      https://*.reddit.com/*/about/muted*
// @exclude      https://*.reddit.com/*/about/rules*
// @exclude      https://*.reddit.com/*/about/stylesheet*
// @exclude      https://*.reddit.com/*/about/traffic*
// @exclude      https://*.reddit.com/*/wiki/*
// @exclude      https://mod.reddit.com/*
// ==/UserScript==

/* jshint esversion: 8 */

(function () {
    "use strict";

    /**
     * The current version of the script
     * @type {string}
     */
    const VERSION = "3.17.3";

    /**
     * Whether or not we are on old reddit and not redesign.
     * This will be set in the "load" event listener.
     * @type {boolean}
     */
    let isOldReddit = false;

    /**
     * Whether or not we are on compact mode.
     * This will be set in the "load" event listener.
     * @type {boolean}
     */
    let isCompact = false;

    /**
     * Timeout to check for new edited comments on page.
     * This will be updated when scrolling.
     * @type {number?}
     */
    let scriptTimeout = null;

    /**
     * The element that is currently requesting content
     * @type {Element?}
     */
    let currentLoading = null;

    /**
     * List of submission ids of edited posts.
     * Used on Reddit redesign since the submissions are not marked as such.
     * This is set in the "load" event listener from the Reddit JSON API.
     * @type {Array<{id: string, edited: float}>}
     */
    let editedSubmissions = [];

    /**
     * The current URL that is being viewed.
     * On Redesign, this can change without the user leaving page,
     * so we want to look for new edited submissions if it changes.
     * @type {string}
     */
    let currentURL = window.location.href;

    /**
     * Showdown markdown converter
     * @type {showdown.Converter}
     */
    const mdConverter = new showdown.Converter({
        tables: true,
        simplifiedAutoLink: true,
        literalMidWordUnderscores: true,
        strikethrough: true,
        ghCodeBlocks: true,
        disableForced4SpacesIndentedSublists: true,
    });

    /**
     * Logging methods for displaying formatted logs in the console.
     *
     * logging.info("This is an info message");
     * logging.warn("This is a warning message");
     * logging.error("This is an error message");
     * logging.table({a: 1, b: 2, c: 3});
     */
    const logging = {
        INFO: "info",
        WARN: "warn",
        ERROR: "error",
        TABLE: "table",

        /**
         * Log a message to the console
         * @param {string} level The console method to use e.g. "log", "info", "warn", "error", "table"
         * @param {...string} messages - Any number of messages to log
         */
        _format_log(level, ...messages) {
            const logger = level in console ? console[level] : console.log;
            logger(`%c[unedit-for-reddit] %c[${level.toUpperCase()}]`, "color: #00b6b6", "color: #888800", ...messages);
        },

        /**
         * Log an info message to the console
         * @param {...string} messages - Any number of messages to log
         */
        info(...messages) {
            logging._format_log(this.INFO, ...messages);
        },

        /**
         * Log a warning message to the console
         * @param {...string} messages - Any number of messages to log
         */
        warn(...messages) {
            logging._format_log(this.WARN, ...messages);
        },

        /**
         * Log an error message to the console
         * @param {...string} messages - Any number of messages to log
         */
        error(...messages) {
            logging._format_log(this.ERROR, ...messages);
        },

        /**
         * Log a table to the console
         * @param {Object} data - The table to log
         */
        table(data) {
            logging._format_log(this.TABLE, data);
        },
    };

    /**
     * Storage methods for saving and retrieving data from local storage.
     *
     * Use the storage API or chrome.storage API if available, otherwise use localStorage.
     *
     * dataStorage.get("key").then((value) => { ... });
     * dataStorage.get("key", "default value").then((value) => { ... });
     * dataStorage.set("key", "value").then(() => { ... });
     */
    const dataStorage = {
        /**
         * Get a value from storage
         * @param {string} key - The key to retrieve
         * @param {string?} defaultValue - The default value to return if the key does not exist
         * @returns {Promise<string>} A promise that resolves with the value
         */
        get(key, defaultValue = null) {
            // retrieve from storage API
            if (dataStorage._isBrowserStorageAvailable()) {
                logging.info(`Retrieving '${key}' from browser.storage.local`);
                return browser.storage.local.get(key).then((result) => {
                    return result[key] || localStorage.getItem(key) || defaultValue;
                });
            } else if (dataStorage._isChromeStorageAvailable()) {
                logging.info(`Retrieving '${key}' from chrome.storage.local`);
                return new Promise((resolve) => {
                    chrome.storage.local.get(key, (result) => {
                        resolve(result[key] || localStorage.getItem(key) || defaultValue);
                    });
                });
            } else {
                logging.info(`Retrieving '${key}' from localStorage`);
                return Promise.resolve(localStorage.getItem(key) || defaultValue);
            }
        },

        /**
         * Set a value in storage
         * @param {string} key - The key to set
         * @param {string} value - The value to set
         * @returns {Promise<void>} A promise that resolves when the value is set
         */
        set(key, value) {
            if (dataStorage._isBrowserStorageAvailable()) {
                logging.info(`Storing '${key}' in browser.storage.local`);
                return browser.storage.local.set({ [key]: value });
            } else if (dataStorage._isChromeStorageAvailable()) {
                logging.info(`Storing '${key}' in chrome.storage.local`);
                return new Promise((resolve) => {
                    chrome.storage.local.set({ [key]: value }, resolve);
                });
            } else {
                logging.info(`Storing '${key}' in localStorage`);
                return Promise.resolve(localStorage.setItem(key, value));
            }
        },

        /**
         * Return whether browser.storage is available
         * @returns {boolean} Whether browser.storage is available
         */
        _isBrowserStorageAvailable() {
            return typeof browser !== "undefined" && browser.storage;
        },

        /**
         * Return whether chrome.storage is available
         * @returns {boolean} Whether chrome.storage is available
         */
        _isChromeStorageAvailable() {
            return typeof chrome !== "undefined" && chrome.storage;
        },

        /**
         * Return whether storage is available (either browser.storage or chrome.storage)
         * @returns {boolean} Whether storage is available
         */
        _isStorageApiAvailable() {
            return dataStorage._isBrowserStorageAvailable() || dataStorage._isChromeStorageAvailable();
        },

        /**
         * Return whether localStorage is available
         * @returns {boolean} Whether localStorage is available
         */
        _isLocalStorageAvailable() {
            return typeof localStorage !== "undefined" && localStorage.getItem;
        },
    };

    /**
     * Parse the URL for the submission ID and comment ID if it exists.
     * @returns {{submissionId: string|null, commentId: string|null}}
     */
    function parseURL() {
        const match = window.location.href.match(/\/comments\/([A-Za-z0-9]+)\/(?:.*?\/([A-Za-z0-9]+))?/);
        return {
            submissionId: (match && match[1]) || null,
            commentId: (match && match[2]) || null,
        };
    }

    /**
     * Find the ID of a comment or submission.
     * @param {Element} innerEl An element inside the comment.
     * @returns {string} The Reddit ID of the comment.
     */
    function getPostId(innerEl) {
        let postId = "";
        // redesign
        if (!isOldReddit) {
            const post = innerEl?.closest("[class*='t1_'], [class*='t3_']");
            if (post) {
                postId = Array.from(post.classList).filter(function (el) {
                    return el.indexOf("t1_") > -1 || el.indexOf("t3_") > -1;
                })[0];
            } else {
                // if post not found, try to find the post id in the URL
                const parsedURL = parseURL();
                postId = parsedURL.commentId || parsedURL.submissionId || postId;
            }
        }
        // old reddit
        else if (!isCompact) {
            // old reddit comment
            postId = innerEl?.closest(".thing")?.id.replace("thing_", "");
            // old reddit submission
            if (!postId && isInSubmission(innerEl)) {
                const match = window.location.href.match(/comments\/([A-Za-z0-9]{5,8})\//);
                postId = match ? match[1] : null;
                // submission in list view
                if (!postId) {
                    const thing = innerEl.closest(".thing");
                    postId = thing?.id.replace("thing_", "");
                }
            }
            // if still not found, check for the .reportform element
            if (!postId) {
                postId = innerEl?.closest(".entry")?.querySelector(".reportform")?.className.replace(/.*t1/, "t1");
            }
            // if still not found check the url
            if (!postId) {
                const parsedURL = parseURL();
                postId = parsedURL.commentId || parsedURL.submissionId || postId;
            }
            // otherwise log an error
            if (!postId) {
                logging.error("Could not find post id", innerEl);
                postId = "";
            }
        }
        // compact
        else {
            const thing = innerEl?.closest(".thing");
            if (thing) {
                const idClass = [...thing.classList].find((c) => c.startsWith("id-"));
                postId = idClass ? idClass.replace("id-", "") : "";
            }
            // if not found, check the url
            if (!postId) {
                const parsedURL = parseURL();
                postId = parsedURL.commentId || parsedURL.submissionId || postId;
            }
        }
        // if the post appears on the page after the last 3 characters are removed, remove them
        const reMatch = postId.match(/(t1_\w+)\w{3}/) || postId.match(/(t3_\w+)\w{3}/);
        if (reMatch && document.querySelector(`.${reMatch[1]}, #thing_${reMatch[1]}`)) {
            postId = reMatch[1];
        }
        return postId;
    }

    /**
     * Get the container of the comment or submission body for appending the original comment to.
     * @param {string} postId The ID of the comment or submission
     * @returns {Element} The container element of the comment or submission body.
     */
    function getPostBodyElement(postId) {
        let bodyEl = null,
            baseEl = null;
        // redesign
        if (!isOldReddit) {
            baseEl = document.querySelector(`#${postId}, .Comment.${postId}`);
            // in post preview popups, the id will appear again but in #overlayScrollContainer
            const popupEl = document.querySelector(`#overlayScrollContainer .Post.${postId}`);
            baseEl = popupEl ? popupEl : baseEl;
            if (baseEl) {
                if (baseEl.getElementsByClassName("RichTextJSON-root").length > 0) {
                    bodyEl = baseEl.getElementsByClassName("RichTextJSON-root")[0];
                } else if (isInSubmission(baseEl) && baseEl?.firstElementChild?.lastElementChild) {
                    const classicBodyEl = baseEl.querySelector(`div[data-adclicklocation="background"]`);
                    if (classicBodyEl) {
                        bodyEl = classicBodyEl;
                    } else {
                        bodyEl = baseEl.firstElementChild.lastElementChild;
                        if (bodyEl.childNodes.length === 1) {
                            bodyEl = bodyEl.firstElementChild;
                        }
                    }
                } else {
                    bodyEl = baseEl;
                }
            } else {
                // check for a paragraph with the text "That Comment Is Missing"
                const missingCommentEl = document.querySelectorAll(`div > div > svg:first-child + p`);
                [...missingCommentEl].some(function (el) {
                    if (el.innerText === "That Comment Is Missing") {
                        bodyEl = el.parentElement;
                        return true;
                    }
                });
            }
        }
        // old reddit
        else if (!isCompact) {
            // old reddit comments
            baseEl = document.querySelector(`form[id*='${postId}'] .md`);
            if (baseEl?.closest(".entry")) {
                bodyEl = baseEl;
            } else {
                baseEl = document.querySelector(".report-" + postId);
                bodyEl = baseEl
                    ? baseEl.closest(".entry").querySelector(".usertext")
                    : document.querySelector("p#noresults");
            }
            // old reddit submissions
            if (!bodyEl) {
                bodyEl =
                    document.querySelector("div[data-url] .entry form .md") ||
                    document.querySelector("div[data-url] .entry form .usertext-body") ||
                    document.querySelector("div[data-url] .entry .top-matter");
            }
            // link view
            if (!bodyEl) {
                bodyEl = document.querySelector(`.id-${postId}`);
            }
        }
        // compact view
        else {
            bodyEl = document.querySelector(`.id-${postId} .md, .id-${postId} form.usertext`);
            // if not found, check for the .usertext element containing it as part of its id
            if (!bodyEl) {
                bodyEl = document.querySelector(".showOriginal")?.parentElement;
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
        const selectors = [
            "a.thumbnail", // old reddit on profile page or list view
            "div[data-url]", // old reddit on submission page
            ".Post", // redesign
        ];
        // class list of .thing contains id-t3_...
        const thing = innerEl?.closest(".thing");
        if (thing) {
            const idClass = [...thing.classList].find((c) => c.startsWith("id-"));
            if (idClass) {
                return idClass.startsWith("id-t3_");
            }
        }
        return Boolean(innerEl.closest(selectors.join(", ")));
    }

    /**
     * Check if the element bounds are within the window bounds.
     * @param {Element} element The element to check
     * @returns {boolean} Whether or not the element is within the window
     */
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Generate HTML from markdown for a comment or submission.
     * @param {string} postType The type of post - "comment" or "post" (submission)
     * @param {string} original The markdown to convert
     * @returns {string} The HTML of the markdown
     */
    function redditPostToHTML(postType, original) {
        // fix Reddit tables to have at least two dashes per cell in the alignment row
        let body = original.replace(/(?<=^\s*|\|\s*)(:?)-(:?)(?=\s*\|[-|\s:]*$)/gm, "$1--$2");
        // convert superscripts in the form "^(some text)" or "^text" to <sup>text</sup>
        const multiwordSuperscriptRegex = /\^\((.+?)\)/gm;
        while (multiwordSuperscriptRegex.test(body)) {
            body = body.replace(multiwordSuperscriptRegex, "<sup>$1</sup>");
        }
        const superscriptRegex = /\^(\S+)/gm;
        while (superscriptRegex.test(body)) {
            body = body.replace(superscriptRegex, "<sup>$1</sup>");
        }
        // convert user and subreddit mentions to links (can be /u/, /r/, u/, or r/)
        body = body.replace(/(?<=^|[^\w\/])(\/?)([ur]\/\w+)/gm, "[$1$2](/$2)");
        // add spaces after '>' to keep blockquotes (if it has '>!' ignore since that is spoilertext)
        body = body.replace(/^((?:&gt;|>)+)(?=[^!\s])/gm, function (match, p1) {
            return p1.replace(/&gt;/g, ">") + " ";
        });
        // convert markdown to HTML
        let html = mdConverter.makeHtml("\n\n### Original " + postType + ":\n\n" + body);
        // convert Reddit spoilertext
        html = html.replace(
            /(?<=^|\s|>)&gt;!(.+?)!&lt;(?=$|\s|<)/gm,
            "<span class='md-spoiler-text' title='Reveal spoiler'>$1</span>"
        );
        // replace &#x200B; with a zero-width space
        return html.replace(/&amp;#x200B;/g, "\u200B");
    }

    /**
     * Create a new paragraph containing the body of the original comment/post.
     * @param {Element} commentBodyElement The container element of the comment/post body.
     * @param {string} postType The type of post - "comment" or "post" (submission)
     * @param {object} postData The archived data of the original comment/post.
     * @param {Boolean} includeBody Whether or not to include the body of the original comment/post.
     */
    function showOriginalComment(commentBodyElement, postType, postData, includeBody) {
        const originalBody = typeof postData?.body === "string" ? postData.body : postData?.selftext;
        // create paragraph element
        const origBodyEl = document.createElement("p");
        origBodyEl.className = "og";
        // set text
        origBodyEl.innerHTML = includeBody ? redditPostToHTML(postType, originalBody) : "";
        // author and date details
        const detailsEl = document.createElement("div");
        detailsEl.style.fontSize = "12px";
        detailsEl.appendChild(document.createTextNode("Posted by "));
        const authorEl = document.createElement("a");
        authorEl.href = `/user/${postData.author}`;
        authorEl.innerText = postData.author;
        detailsEl.appendChild(authorEl);
        detailsEl.appendChild(document.createTextNode(" · "));
        const dateEl = document.createElement("a");
        dateEl.href = postData.permalink;
        dateEl.title = new Date(postData.created_utc * 1000).toString();
        dateEl.innerText = getRelativeTime(postData.created_utc);
        detailsEl.appendChild(dateEl);
        // append horizontal rule if the original body is shown
        if (includeBody) {
            origBodyEl.appendChild(document.createElement("hr"));
        }
        // append to original comment
        origBodyEl.appendChild(detailsEl);
        const existingOg = commentBodyElement.querySelector(".og");
        if (existingOg && includeBody) {
            // if there is an existing paragraph and this element contains the body, replace it
            existingOg.replaceWith(origBodyEl);
        } else if (!existingOg) {
            // if there is no existing paragraph, append it
            commentBodyElement.appendChild(origBodyEl);
        }
        // scroll into view
        setTimeout(function () {
            if (!isInViewport(origBodyEl)) {
                origBodyEl.scrollIntoView({ behavior: "smooth" });
            }
        }, 500);
        // Redesign
        if (!isOldReddit) {
            // Make sure collapsed submission previews are expanded to not hide the original comment.
            commentBodyElement.parentElement.style.maxHeight = "unset";
        }
        // Old reddit
        else {
            // If the comment is collapsed, expand it so the original comment is visible
            expandComment(commentBodyElement);
        }
    }

    /**
     * Expand comment if it is collapsed (on old reddit only).
     * @param {Element} innerEl An element inside the comment.
     */
    function expandComment(innerEl) {
        const collapsedComment = innerEl.closest(".collapsed");
        if (collapsedComment) {
            collapsedComment.classList.remove("collapsed");
            collapsedComment.classList.add("noncollapsed");
        }
    }

    /**
     * Handle show original event given the post to show content for.
     * @param {Element} linkEl The link element for showing the status.
     * @param {object} out The response from the API.
     * @param {object} post The archived data of the original comment/post.
     * @param {string} postId The ID of the original comment/post.
     * @param {Boolean} includeBody Whether or not to include the body of the original comment/post.
     */
    function handleShowOriginalEvent(linkEl, out, post, postId, includeBody) {
        // locate comment body
        const commentBodyElement = getPostBodyElement(postId);
        // check that comment was fetched and body element exists
        if (!commentBodyElement) {
            // the comment body element was not found
            linkEl.innerText = "body element not found";
            linkEl.title = "Please report this issue to the developer on GitHub.";
            logging.error("Body element not found:", out);
        } else if (typeof post?.body === "string") {
            // create new paragraph containing the body of the original comment
            showOriginalComment(commentBodyElement, "comment", post, includeBody);
            // remove loading status from comment
            linkEl.innerText = "";
            linkEl.removeAttribute("title");
            logging.info("Successfully loaded comment.");
        } else if (typeof post?.selftext === "string") {
            // check if result has selftext instead of body (it is a submission post)
            // create new paragraph containing the selftext of the original submission
            showOriginalComment(commentBodyElement, "post", post, includeBody);
            // remove loading status from post
            linkEl.innerText = "";
            linkEl.removeAttribute("title");
            logging.info("Successfully loaded post.");
        } else if (out?.data?.length === 0) {
            // data was returned empty
            linkEl.innerText = "not found";
            linkEl.title = "No matching results were found in the Pushshift archive.";
            logging.warn("No results:", out);
        } else if (out?.data?.length > 0) {
            // no matching comment/post was found in the data
            linkEl.innerText = "not found";
            linkEl.title = "The comment/post was not found in the Pushshift archive.";
            logging.warn("No matching post:", out);
        } else {
            // other issue occurred with displaying comment
            if (linkEl.innerText === "fetch failed") {
                const errorLink = linkEl.parentElement.querySelector(".error-link");
                const linkToPushshift = errorLink || document.createElement("a");
                linkToPushshift.target = "_blank";
                linkToPushshift.style = `text-decoration: underline;
                                        cursor: pointer;
                                        margin-left: 6px;
                                        font-style: normal;
                                        font-weight: bold;
                                        color: #e5766e;`;
                linkToPushshift.className = linkEl.className;
                linkToPushshift.classList.add("error-link");
                linkToPushshift.href = out?.detail
                    ? "https://api.pushshift.io/signup"
                    : "https://www.reddit.com/r/pushshift/";
                linkToPushshift.innerText = out?.detail || "CHECK r/PUSHSHIFT FOR MORE INFO";
                if (errorLink === null) {
                    linkEl.parentElement.appendChild(linkToPushshift);
                }
                // unhide token container if token is missing or invalid
                if (out?.detail) {
                    const tokenContainer = document.querySelector("#tokenContainer");
                    tokenContainer.style.display = "block";
                    dataStorage.set("hideTokenContainer", "false");
                }
            }
            linkEl.innerText = "fetch failed";
            linkEl.title = "A Pushshift error occurred. Please check r/pushshift for updates.";
            logging.error("Fetch failed:", out);
        }
    }

    /**
     * Fetch alternative that runs fetch from the window context using a helper element.
     *
     * This is necessary because in Firefox the headers are not sent when running fetch from the addon context.
     *
     * @param {string} url The URL to fetch.
     * @param {object} options The options to pass to fetch.
     * @returns {Promise} The fetch promise.
     */
    function inlineFetch(url, options) {
        const outputContainer = document.createElement("div");
        outputContainer.id = "outputContainer" + Math.floor(Math.random() * Math.pow(10, 10));
        outputContainer.style.display = "none";
        document.body.appendChild(outputContainer);
        const responseContainer = document.createElement("div");
        responseContainer.id = "responseContainer" + Math.floor(Math.random() * Math.pow(10, 10));
        responseContainer.style.display = "none";
        document.body.appendChild(responseContainer);
        const temp = document.createElement("button");
        temp.setAttribute("type", "button");
        temp.setAttribute(
            "onclick",
            `fetch("${url}", ${JSON.stringify(options)})
            .then(r => {
                document.querySelector("#${responseContainer.id}").innerText = JSON.stringify({
                    ok: r.ok,
                    status: r.status,
                    statusText: r.statusText,
                    headers: Object.fromEntries(r.headers.entries()),
                });
                return r.text();
            })
            .then(t => document.querySelector("#${outputContainer.id}").innerText = t)`
        );
        temp.style.display = "none";
        document.body.appendChild(temp);
        temp.click();
        // wait for fetch to complete and return a promise
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (outputContainer.innerText && responseContainer.innerText) {
                    clearInterval(interval);
                    const responseData = JSON.parse(responseContainer.innerText);
                    const mockResponse = {
                        text: () => outputContainer.innerText,
                        json: () => JSON.parse(outputContainer.innerText),
                        ok: responseData.ok,
                        status: responseData.status,
                        statusText: responseData.statusText,
                        headers: {
                            get: (header) => responseData.headers[header],
                        },
                    };
                    resolve(mockResponse);
                    outputContainer.remove();
                    responseContainer.remove();
                    temp.remove();
                }
            }, 100);
        });
    }

    /**
     * Create a link to view the original comment/post.
     * @param {Element} innerEl An element inside the comment or post to create a link for.
     */
    function createLink(innerEl) {
        // if there is already a link, don't create another unless the other was a show author link
        if (innerEl.parentElement.querySelector("a.showOriginal:not(.showAuthorOnly)")) {
            return;
        }
        // create link to "Show orginal" or "Show author"
        const showAuthor = innerEl.classList.contains("showAuthorOnly");
        const showLinkEl = document.createElement("a");
        showLinkEl.innerText = showAuthor ? "Show author" : "Show original";
        showLinkEl.className = innerEl.className + " showOriginal";
        showLinkEl.classList.remove("error");
        showLinkEl.style.textDecoration = "underline";
        showLinkEl.style.cursor = "pointer";
        showLinkEl.style.marginLeft = "6px";
        showLinkEl.title = "Click to show data from the original post or comment";
        innerEl.parentElement.appendChild(showLinkEl);
        innerEl.classList.add("match");
        // find id of selected comment or submission
        const postId = getPostId(showLinkEl);
        showLinkEl.alt = `View original post for ID ${postId}`;
        if (!postId) {
            showLinkEl.parentElement.removeChild(showLinkEl);
        }
        // click event
        showLinkEl.addEventListener(
            "click",
            async function () {
                // allow only 1 request at a time
                if (typeof currentLoading != "undefined" && currentLoading !== null) {
                    return;
                }
                // create url for getting comment/post from pushshift api
                const URLs = [];
                const idURL = isInSubmission(this)
                    ? `https://api.pushshift.io/reddit/search/submission/?ids=${postId}&fields=selftext,author,id,created_utc,permalink`
                    : `https://api.pushshift.io/reddit/search/comment/?ids=${postId}&fields=body,author,id,link_id,created_utc,permalink`;
                URLs.push(idURL);
                // create url for getting author comments/posts from pushshift api
                const author = this.parentElement.querySelector("a[href*=user]")?.innerText;
                if (author) {
                    const authorURL = isInSubmission(this)
                        ? `https://api.pushshift.io/reddit/search/submission/?author=${author}&size=200&fields=selftext,author,id,created_utc,permalink`
                        : `https://api.pushshift.io/reddit/search/comment/?author=${author}&size=200&fields=body,author,id,link_id,created_utc,permalink`;
                    URLs.push(authorURL);
                }
                // if the author is unknown, check the parent post as an alternative instead
                else if (!isInSubmission(this)) {
                    const parsedURL = parseURL();
                    if (parsedURL.submissionId) {
                        const parentURL = `https://api.pushshift.io/reddit/comment/search?q=*&link_id=${parsedURL.submissionId}&size=200&fields=body,author,id,link_id,created_utc,permalink`;
                        URLs.push(parentURL);
                    }
                }

                // set loading status
                currentLoading = this;
                this.innerText = "loading...";
                this.title = "Loading data from the original post or comment";

                logging.info(`Fetching from ${URLs.join(" and ")}`);

                const token = document.querySelector("#apiToken").value;

                // request from pushshift api
                await Promise.all(
                    URLs.map((url) =>
                        fetch(url, {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                                "User-Agent": "Unedit and Undelete for Reddit",
                                accept: "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                        })
                            .then((response) => {
                                if (!response.ok) {
                                    logging.error("Response not ok:", response);
                                }
                                try {
                                    return response.json();
                                } catch (e) {
                                    throw Error(`Invalid JSON Response: ${response}`);
                                }
                            })
                            .catch((error) => {
                                logging.error("Error:", error);
                            })
                    )
                )
                    .then((responses) => {
                        responses.forEach((out) => {
                            // locate the comment that was being loaded
                            const loading = currentLoading;
                            // exit if already found
                            if (loading.innerText === "") {
                                return;
                            }
                            const post = out?.data?.find((p) => p?.id === postId?.split("_").pop());
                            logging.info("Response:", { author, id: postId, post, data: out?.data });
                            const includeBody = !loading.classList.contains("showAuthorOnly");
                            handleShowOriginalEvent(loading, out, post, postId, includeBody);
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
     * Convert unix timestamp in seconds to a relative time string (e.g. "2 hours ago").
     * @param {number} timestamp A unix timestamp in seconds.
     * @returns {string} A relative time string.
     */
    function getRelativeTime(timestamp) {
        const time = new Date(timestamp * 1000);
        const now = new Date();
        const seconds = Math.round((now.getTime() - time.getTime()) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);
        const months = Math.round(days / 30.5);
        const years = Math.round(days / 365);
        if (years > 0 && months >= 12) {
            return `${years} ${years === 1 ? "year" : "years"} ago`;
        }
        if (months > 0 && days >= 30) {
            return `${months} ${months === 1 ? "month" : "months"} ago`;
        }
        if (days > 0 && hours >= 24) {
            return `${days} ${days === 1 ? "day" : "days"} ago`;
        }
        if (hours > 0 && minutes >= 60) {
            return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
        }
        if (minutes > 0 && seconds >= 60) {
            return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
        }
        return "just now";
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
        let selectors = [],
            elementsToCheck = [],
            editedComments = [];
        // redesign
        if (!isOldReddit) {
            // check for edited/deleted comments and deleted submissions
            selectors = [
                ".Comment div:first-of-type span:not([data-text]):not(.found)", // Comments "edited..." or "Comment deleted/removed..."
                ".Post div div div:last-of-type div ~ div:last-of-type:not([data-text]):not(.found)", // Submissions "It doesn't appear in any feeds..." message
                ".Post > div:only-child > div:nth-of-type(5) > div:last-of-type > div:not([data-text]):only-child:not(.found)", // Submissions "Sorry, this post is no longer available." message
                ".Comment div.RichTextJSON-root > p:only-child:not([data-text]):not(.found)", // Comments "[unavailable]" message
                "div > div > svg:first-child + p:not(.found)", // "That Comment Is Missing" page
            ];
            elementsToCheck = Array.from(document.querySelectorAll(selectors.join(", ")));
            editedComments = elementsToCheck.filter(function (el) {
                el.classList.add("found");
                // we only care about the element if it has no children
                if (el.children.length) {
                    return false;
                }
                // there are only specific phrases we care about in a P element
                if (
                    el.tagName === "P" &&
                    el.innerText !== "[unavailable]" &&
                    el.innerText !== "[ Removed by Reddit ]" &&
                    el.innerText !== "That Comment Is Missing"
                ) {
                    return false;
                }
                // include "[unavailable]" comments (blocked by user) if from a deleted user
                const isUnavailable =
                    el.innerText === "[unavailable]" &&
                    el?.parentElement?.parentElement?.parentElement
                        ?.querySelector("div")
                        ?.innerText?.includes("[deleted]");
                const isEditedOrRemoved =
                    el.innerText.substring(0, 6) === "edited" || // include edited comments
                    el.innerText.substring(0, 15) === "Comment deleted" || // include comments deleted by user
                    el.innerText.substring(0, 15) === "Comment removed" || // include comments removed by moderator
                    el.innerText.substring(0, 30) === "It doesn't appear in any feeds" || // include deleted submissions
                    el.innerText.substring(0, 23) === "Moderators remove posts" || // include submissions removed by moderators
                    isUnavailable || // include unavailable comments (blocked by user)
                    el.innerText === "[ Removed by Reddit ]" || // include comments removed by Reddit
                    el.innerText === "That Comment Is Missing" || // include comments not found in comment tree
                    el.innerText.substring(0, 29) === "Sorry, this post is no longer"; // include unavailable submissions (blocked by user)
                const isDeletedAuthor = el.innerText === "[deleted]"; // include comments from deleted users
                // if the element has a deleted author, make a link to only show the deleted author
                if (isDeletedAuthor) {
                    el.classList.add("showAuthorOnly");
                }
                // keep element if it is edited or removed or if it has a deleted author
                return isEditedOrRemoved || isDeletedAuthor;
            });
            // Edited submissions found using the Reddit API
            editedSubmissions.forEach((submission) => {
                let found = false;
                const postId = submission.id;
                const editedAt = submission.edited;
                const deletedAuthor = submission.deletedAuthor;
                const deletedPost = submission.deletedPost;
                selectors = [
                    `#t3_${postId} > div:first-of-type > div:nth-of-type(2) > div:first-of-type > div:first-of-type > span:first-of-type:not(.found)`, // Submission page
                    `#t3_${postId} > div:first-of-type > div:nth-of-type(2) > div:first-of-type > div:first-of-type > div:first-of-type > div:first-of-type > span:first-of-type:not(.found)`, // Comment context page
                    `#t3_${postId} > div:last-of-type[data-click-id] > div:first-of-type > div:first-of-type > div:first-of-type:not(.found)`, // Subreddit listing view
                    `.Post.t3_${postId} > div:last-of-type[data-click-id] > div:first-of-type > div:nth-of-type(2) > div:not([data-adclicklocation]):first-of-type:not(.found)`, // Profile/home/classic listing view
                    `.Post.t3_${postId} > div:first-of-type > div[data-click-id="background"] > div:first-of-type > div[data-click-id="body"] > div[data-adclicklocation="top_bar"]:not(.found)`, // Compact listing view
                    `.Post.t3_${postId} > div:last-of-type[data-click-id] > div:first-of-type > div:nth-of-type(2) div[data-adclicklocation="top_bar"]:not(.found)`, // Profile/home listing view
                    `.Post.t3_${postId}:not(.scrollerItem) > div:first-of-type > div:nth-of-type(2) > div:nth-of-type(2) > div:first-of-type > div:first-of-type:not(.found)`, // Preview popup
                ];
                Array.from(document.querySelectorAll(selectors.join(", "))).forEach((el) => {
                    // add found class so that it won't be checked again in the future
                    el.classList.add("found");
                    // if this is the first time we've found this post, add it to the list of posts to add the link to
                    if (!found) {
                        found = true;
                        editedComments.push(el);
                        if (editedAt) {
                            if (!el.parentElement.querySelector(".edited-date")) {
                                // display when the post was edited
                                const editedDateElement = document.createElement("span");
                                editedDateElement.classList.add("edited-date");
                                editedDateElement.style.fontStyle = "italic";
                                editedDateElement.innerText = ` \u00b7 edited ${getRelativeTime(editedAt)}`; // middle-dot = \u00b7
                                el.parentElement.appendChild(editedDateElement);
                            }
                        } else if (deletedAuthor && !deletedPost) {
                            // if the post was not edited, make a link to only show the deleted author
                            el.classList.add("showAuthorOnly");
                        }
                    }
                });
            });
            // If the url has changed, check for edited submissions again
            // This is an async fetch that will check for edited submissions again when it is done
            if (currentURL !== window.location.href) {
                logging.info(`URL changed from ${currentURL} to ${window.location.href}`);
                currentURL = window.location.href;
                checkForEditedSubmissions();
            }
        }
        // old Reddit and compact Reddit
        else {
            selectors = [
                ".entry p.tagline time:not(.found)", // Comment or Submission "last edited" timestamp
                ".entry p.tagline em:not(.found), .entry .tagline span:first-of-type:not(.flair):not(.found)", // Comment "[deleted]" author
                "div[data-url] p.tagline span:first-of-type:not(.flair):not(.found)", // Submission "[deleted]" author
                "div[data-url] .usertext-body em:not(.found), form.usertext em:not(.found)", // Submission "[removed]" body
                ".entry .usertext .usertext-body > div.md > p:only-child:not(.found)", // Comment "[unavailable]" body
                "p#noresults", // "there doesn't seem to be anything here" page
            ];
            elementsToCheck = Array.from(document.querySelectorAll(selectors.join(", ")));
            editedComments = elementsToCheck.filter(function (el) {
                el.classList.add("found");
                // The only messages we care about in a P element right now is "[unavailable]" or #noresults
                if (
                    el.tagName === "P" &&
                    el.innerText !== "[unavailable]" &&
                    el.innerText !== "[ Removed by Reddit ]" &&
                    el.id !== "noresults"
                ) {
                    return false;
                }
                // include "[unavailable]" comments (blocked by user) if from a deleted user
                const isUnavailable =
                    el.innerText === "[unavailable]" &&
                    el?.closest(".entry").querySelector(".tagline").innerText.includes("[deleted]");
                const isEditedRemovedOrDeletedAuthor =
                    el.title.substring(0, 11) === "last edited" || // include edited comments or submissions
                    el.innerText === "[deleted]" || // include comments or submissions deleted by user
                    el.innerText === "[removed]" || // include comments or submissions removed by moderator
                    el.innerText === "[ Removed by Reddit ]" || // include comments or submissions removed by Reddit
                    el.id === "noresults" || // include "there doesn't seem to be anything here" page
                    isUnavailable; // include unavailable submissions (blocked by user)
                // if the element is a deleted author and not edited or removed, only show the deleted author
                if (
                    el.innerText === "[deleted]" &&
                    el.tagName.toUpperCase() === "SPAN" && // tag name is span (not em as it appears for deleted comments)
                    ["[deleted]", "[removed]"].indexOf(el.closest(".entry")?.querySelector(".md")?.innerText) === -1 // content of post is not deleted or removed
                ) {
                    el.classList.add("showAuthorOnly");
                }
                // keep element if it is edited or removed or if it has a deleted author
                return isEditedRemovedOrDeletedAuthor;
            });
        }
        // create links
        editedComments.forEach(function (el) {
            // for removed submissions, add the link to an element in the tagline instead of the body
            if (el.closest(".usertext-body") && el.innerText === "[removed]") {
                el = el.closest(".entry")?.querySelector("p.tagline span:first-of-type") || el;
            }
            createLink(el);
        });
    }

    /**
     * If the script timeout is not already set, set it and
     * run the findEditedComments in a second, otherwise do nothing.
     */
    function waitAndFindEditedComments() {
        if (!scriptTimeout) {
            scriptTimeout = setTimeout(findEditedComments, 1000);
        }
    }

    /**
     * Check for edited submissions using the Reddit JSON API.
     *
     * Since the Reddit Redesign website does not show if a submission was edited,
     * we will check the data in the Reddit JSON API for the information.
     */
    function checkForEditedSubmissions() {
        // don't need to check if we're not on a submission page or list view
        if (!document.querySelector(".Post, .ListingLayout-backgroundContainer")) {
            return;
        }
        // append .json to the page URL but before the ?
        const [url, query] = window.location.href.split("?");
        const jsonUrl = `${url}.json` + (query ? `?${query}` : "");
        logging.info(`Fetching additional info from ${jsonUrl}`);
        fetch(jsonUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Unedit and Undelete for Reddit",
            },
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(function (data) {
                logging.info("Response:", data);
                const out = data?.length ? data[0] : data;
                const children = out?.data?.children;
                if (children) {
                    editedSubmissions = children
                        .filter(function (post) {
                            return post.kind === "t3" && (post.data.edited || post.data.author === "[deleted]");
                        })
                        .map(function (post) {
                            return {
                                id: post.data.id,
                                edited: post.data.edited,
                                deletedAuthor: post.data.author === "[deleted]",
                                deletedPost: post.data.selftext === "[deleted]" || post.data.selftext === "[removed]",
                            };
                        });
                    logging.info("Edited submissions:", editedSubmissions);
                    setTimeout(findEditedComments, 1000);
                }
            })
            .catch(function (error) {
                logging.error(`Error fetching additional info from ${jsonUrl}`, error);
            });
    }

    // check for new comments when you scroll
    window.addEventListener("scroll", waitAndFindEditedComments, true);

    // check for new comments when you click
    document.body.addEventListener("click", waitAndFindEditedComments, true);

    // add additional styling, find edited comments, and set old reddit status on page load
    function init() {
        // output the version number to the console
        logging.info(`Unedit and Undelete for Reddit v${VERSION}`);
        // determine if reddit is old or redesign
        isOldReddit = /old\.reddit/.test(window.location.href) || !!document.querySelector("#header-img");
        isCompact = document.querySelector("#header-img-a")?.href?.endsWith(".compact") || false;
        // upgrade insecure requests
        document.head.insertAdjacentHTML(
            "beforeend",
            `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">`
        );
        // Reddit redesign
        if (!isOldReddit) {
            // fix styling of created paragraphs in new reddit
            document.head.insertAdjacentHTML(
                "beforeend",
                `<style>
                    p.og {
                        background: rgb(255, 245, 157) !important;
                        color: black !important;
                        opacity: 0.96;
                        font-size: 14px;
                        padding: 16px;
                        line-height: 20px;
                        border-radius: 4px;
                        width: auto;
                        width: -moz-available;
                        width: -webkit-fill-available;
                    }
                    p.og pre {
                        font-family: monospace;
                        background: #fff59d;
                        padding: 6px;
                        margin: 6px 0;
                        color: black;
                    }
                    p.og h1, p.og h2, p.og h3, p.og h4, p.og h5, p.og h6, p.og p, p.og div {
                        margin: 1em 0 0.5em 0;
                    }
                    p.og h1 {
                        font-size: 2em;
                    }
                    p.og h2 {
                        font-size: 1.5em;
                    }
                    p.og>h3:first-child {
                        font-weight: bold;
                        margin-bottom: 0.5em;
                    }
                    p.og h3 {
                        font-size: 1.17em;
                    }
                    p.og h4 {
                        font-size: 1em;
                    }
                    p.og h5 {
                        font-size: 0.83em;
                    }
                    p.og h6 {
                        font-size: 0.67em;
                    }
                    p.og a {
                        color: #3e88a0;
                        text-decoration: underline;
                    }
                    p.og pre {
                        background: #d7d085 !important;
                    }
                    p.og :not(pre)>code {
                        font-family: monospace;
                        background: #d7d085 !important;
                        padding: 1px !important;
                    }
                    p.og summary {
                        cursor: pointer;
                    }
                    p.og hr {
                        border: none;
                        border-bottom: 1px solid #666;
                        background: transparent;
                    }
                    p.og table {
                        border: 2px solid black;
                    }
                    p.og table td, p.og table th {
                        border: 1px solid black;
                        padding: 4px;
                    }
                    p.og sup {
                        position: relative;
                        font-size: .7em;
                        line-height: .7em;
                        top: -0.4em;
                    }
                    span.md-spoiler-text {
                        background: #545452;
                        border-radius: 2px;
                        transition: background 1s ease-out;
                        cursor: pointer;
                        color: #545452;
                    }
                    span.md-spoiler-text.revealed {
                        background: rgba(84,84,82,.1);
                        color: inherit;
                    }
                    p.og em {
                        font-style: italic;
                    }
                    p.og strong {
                        font-weight: bold;
                    }
                    p.og blockquote {
                        border-left: 4px solid #c5c1ad;
                        padding: 0 8px;
                        margin-left: 5px;
                        margin-top: 0.35714285714285715em;
                        margin-bottom: 0.35714285714285715em;
                    }
                    p.og ol {
                        list-style: auto;
                        margin-left: 1.5em;
                    }
                    p.og ul {
                        list-style: initial;
                        margin-left: 1.5em;
                    }
                    span.edited-date, a.showOriginal {
                        font-size: small;
                    }
                    /* Add some space under the View all comments button on "That Comment Is Missing" page */
                    div:first-child > div:first-child > svg + p + a[role="button"] {
                        margin-bottom: 1em;
                    }
                </style>`
            );
            // listen for spoilertext in original body to be revealed
            window.addEventListener(
                "click",
                function (e) {
                    /**
                     * @type {HTMLSpanElement}
                     */
                    const spoiler = e.target.closest("span.md-spoiler-text");
                    if (spoiler) {
                        spoiler.classList.add("revealed");
                        spoiler.removeAttribute("title");
                        spoiler.style.cursor = "auto";
                    }
                },
                false
            );
            // check for edited submissions
            checkForEditedSubmissions();
        }
        // Old Reddit
        else {
            // fix styling of created paragraphs in old reddit
            document.head.insertAdjacentHTML(
                "beforeend",
                `<style>
                    div p.og {
                        background: rgb(255, 245, 157) !important;
                        color: black !important;
                        opacity: 0.96;
                        font-size: 14px;
                        padding: 16px;
                        line-height: 20px;
                        border-radius: 7px;
                    }
                    p.og p, p.og h1, p.og h2, p.og h3, p.og h4, p.og h5, p.og h6, p.og pre, p.og :not(pre)>code, p.og div {
                        color: black !important;
                        margin: 0.4em 0 0.2em 0;
                    }
                    p.og :not(pre)>code {
                        background: #d7d085 !important;
                        padding: 1px !important;
                    }
                    div p.og a {
                        color: #0079d3 !important;
                    }
                    div p.og a:visited {
                        color: #469ad8!important;
                    }
                    p.og table {
                        border: 2px solid black;
                    }
                    p.og table td, p.og table th {
                        border: 1px solid black;
                        padding: 4px;
                    }
                    p.og table tr {
                        background: none !important;
                    }
                    p.og strong {
                        font-weight: 600;
                    }
                    p.og em {
                        font-style: italic;
                    }
                    /* Override for RES Night mode */
                    .res-nightmode .entry.res-selected .md-container > .md p.og,
                    .res-nightmode .entry.res-selected .md-container > .md p.og p {
                        color: black !important;
                    }
                    /* Override RES title text display */
                    .res-betteReddit-showLastEditedTimestamp .edited-timestamp.showOriginal[title]::after {
                        content: "";
                    }
                </style>`
            );
        }
        // find edited comments
        findEditedComments();

        // create an input field in the bottom right corner of the screen for the api token
        document.head.insertAdjacentHTML(
            "beforeend",
            `<style>
                #apiToken {
                    width: 300px;
                    padding: 5px;
                }
                #requestTokenLink {
                    color: white;
                    border-radius: 3px;
                    margin-left: 5px;
                }
                #saveButton {
                    background: #2D3133;
                    color: white;
                    border-radius: 3px;
                    padding: 5px;
                    margin-left: 5px;
                    border: none;
                    cursor: pointer;
                }
                #saveButton:hover {
                    background: #545452;
                }
                #saveButton:active {
                    background: #2D3133;
                }
                #closeButton {
                    margin-left: 5px;
                    border-radius: 5px;
                    color: rgb(255, 255, 255);
                    padding: 5px;
                    background: transparent;
                    border: 0;
                    cursor: pointer;
                }
                #tokenContainer {
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    z-index: 999999999;
                    padding: 6px;
                    background: #CC3700;
                    border-radius: 5px;
                }
            </style>`
        );
        const tokenInput = document.createElement("input");
        tokenInput.type = "text";
        tokenInput.id = "apiToken";
        tokenInput.placeholder = "Pushshift API Token";
        // if there is a token saved in local storage, use it
        dataStorage.get("apiToken").then((token) => {
            if (token) {
                tokenInput.value = token;
            }
        });
        const requestTokenLink = document.createElement("a");
        requestTokenLink.href = "https://api.pushshift.io/signup";
        requestTokenLink.target = "_blank";
        requestTokenLink.rel = "noopener noreferrer";
        requestTokenLink.textContent = "Request Token";
        requestTokenLink.id = "requestTokenLink";
        const saveButton = document.createElement("button");
        saveButton.textContent = "Save";
        saveButton.id = "saveButton";
        saveButton.addEventListener("click", function () {
            // save in local storage
            dataStorage.set("apiToken", tokenInput.value);
        });
        tokenInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                saveButton.click();
            }
        });
        const closeButton = document.createElement("button");
        closeButton.textContent = "\u00D7"; // times symbol
        closeButton.id = "closeButton";
        const tokenContainer = document.createElement("div");
        tokenContainer.id = "tokenContainer";
        tokenContainer.appendChild(tokenInput);
        tokenContainer.appendChild(saveButton);
        tokenContainer.appendChild(requestTokenLink);
        tokenContainer.appendChild(closeButton);
        closeButton.addEventListener("click", function () {
            // set the token container to display none
            tokenContainer.style.display = "none";
            // save preference in local storage
            dataStorage.set("hideTokenContainer", "true");
        });
        // if the user has hidden the token container before, hide it again
        dataStorage.get("hideTokenContainer").then((hideTokenContainer) => {
            if (hideTokenContainer === "true") {
                tokenContainer.style.display = "none";
            }
        });
        document.body.appendChild(tokenContainer);

        // switch from fetch to inlineFetch if browser is Firefox
        if (navigator.userAgent.includes("Firefox")) {
            fetch = inlineFetch;
        }
    }

    // if the window is loaded, run init(), otherwise wait for it to load
    if (document.readyState === "complete") {
        init();
    } else {
        window.addEventListener("load", init, false);
    }
})();
