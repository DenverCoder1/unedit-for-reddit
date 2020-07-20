// ==UserScript==
// @name         Unedit for Reddit
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Creates the option next to edited Reddit comments to show the original comment from before it was edited
// @author       u/eyl327
// @match        http*://*.reddit.com/r/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var isOldReddit = /old\.reddit/.test(window.location.href);

    var scriptTimeout = null;

    var currentLoading;

    /* find the id of a comment */
    function getId(e, old) {
        var id = "";
        try {
            if (!old) {
                var comment = e.parentElement.parentElement.parentElement.parentElement.querySelector(".Comment");
                id = Array.from(comment.classList).filter(function (x) { return x.indexOf("_") > -1; })[0];
            }
            else {
                id = e.parentElement.parentElement.parentElement.id.split("_").slice(1).join("_");
            }
        }
        catch (error) {
            return null;
        }
        return id;
    }

    /* get the last paragraph of the comment body */
    function getCommentBodyElement(id, old) {
        var el = null;
        try {
            if (!old) {
                el = Array.from(document.getElementById(id).getElementsByTagName("p")).slice(-1)[0];
            }
            else {
                el = Array.from(document.querySelector("form[id*="+id+"] div.md").getElementsByTagName("p")).slice(-1)[0];
            }
        }
        catch (error) {
            return null;
        }
        return el;
    }

    /* create links and define click event */
    function createLink(x) {
        /* create link */
        var l = document.createElement("a");
        l.innerText = "Show original";
        l.className = x.className + " showOriginal";
        l.style.textDecoration = "underline";
        l.style.cursor = "pointer";
        x.parentElement.appendChild(l);
        x.className += " found";
        /* click event */
        l.addEventListener("click", function () {
            /* allow only 1 request at a time */
            if ((typeof (currentLoading) != "undefined") && (currentLoading !== null)) { return; }
            /* collect info on selected comment */
            var id = getId(this, isOldReddit);
            var url = "https://api.pushshift.io/reddit/search/comment/?ids=" + id + "&sort=desc&sort_type=created_utc";
            /* set loading status */
            currentLoading = this;
            this.innerHTML = "loading...";
            /* fetch original comment from pushshift api */
            fetch(url)
                .then(function (res) { return res.json(); })
                .then(function (out) {
                    /* locate the comment that was being loaded */
                    var loading = currentLoading;
                    /* reset status */
                    currentLoading = null;
                    /* locate comment body */
                    var id = getId(loading, isOldReddit);
                    var commentBodyElement = getCommentBodyElement(id, isOldReddit);
                    /* check that comment was fetched and body element exists */
                    if (commentBodyElement && out && out.data && (out.data.length > 0) && out.data[0].body) {
                        /* create new paragraph containing the body of the original comment */
                        var origBody = document.createElement("p");
                        origBody.innerText = "\nOriginal comment:\n" + out.data[0].body;
                        origBody.className = x.className;
                        origBody.style.opacity = 0.96;
                        origBody.style.fontStyle = "italic";
                        origBody.style.fontSize = "94%";
                        origBody.style.background = "#ffed4c5c";
                        origBody.style.paddingBottom = "16px";
                        origBody.style.paddingLeft = "16px";
                        commentBodyElement.appendChild(origBody);
                        /* remove loading status from comment */
                        loading.innerHTML = "";
                    }
                   else if (out && out.data && (out.data.length === 0)) {
                        loading.innerHTML = "comment not found";
                    }
                    else {
                        loading.innerHTML = "fetch failed";
                    }
                })
                .catch(function(err) { throw err; });
        }, false);
    }

    /* locate comments and call function to add links to each */
    function findEditedComments() {
        /* when function runs, cancel timeout */
        if (scriptTimeout) {
            scriptTimeout = null;
        }
        /* list of comments which have been edited */
        var editedComments = [];
        /* Redesign */
        if (!isOldReddit) {
            editedComments = Array.from(document.querySelectorAll(".Comment div span")).filter(function (x, y, z) {
                return x.parentElement.querySelector("a.showOriginal") === null &&
                    x.innerText.substr(0, 6) == "edited";
            });
        }
        /* Old Reddit */
        else {
            editedComments = Array.from(document.querySelectorAll("time")).filter(function (x, y, z) {
                return Array.from(x.classList).indexOf("found") < 0 &&
                    x.title.substr(0,11) == "last edited";
            });
        }
        /* create links */
        editedComments.forEach(function (x, y, z) { createLink(x); });
    }

    /* check for new comments when you scroll */
    window.onscroll = function () {
        if (!scriptTimeout) {
            scriptTimeout = setTimeout(findEditedComments, 1000);
        }
    };

    findEditedComments();
})();