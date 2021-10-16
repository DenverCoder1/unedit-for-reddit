// ==UserScript==
// @name         Unedit and Undelete for Reddit
// @namespace    http://tampermonkey.net/
// @version      3.6.0
// @description  Creates the option next to edited and deleted Reddit comments/posts to show the original comment from before it was edited
// @author       u/DenverCoder1
// @match        *://*reddit.com/*
// @include      https://*.reddit.com/*
// @include      https://reddit.com/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/showdown@1.9.0/dist/showdown.min.js
// ==/UserScript==

(function () {
    'use strict';

    /* check if website is an old reddit url or has an old reddit image header */
    var isOldReddit = /old\.reddit/.test(window.location.href) || !!document.querySelector("#header-img");

    /* timeout to check for new edited comments on page */
    var scriptTimeout = null;

    /* variable to store the element that is currently requesting content */
    var currentLoading;

    /* initialize showdown markdown converter */
    var mdConverter = new showdown.Converter();

    /* find the id of a comment */
    function getId(e, old) {
        var id = "";
        try {
            if (!old) {
                var comment = e?.parentElement?.parentElement?.parentElement?.parentElement?.querySelector(".Comment");
                if (!comment) {
                  comment = e?.parentElement?.parentElement?.parentElement?.parentElement;
                }
                id = Array.from(comment.classList).filter(function (x) { return x.indexOf("_") > -1; })[0];
            }
            else {
                id = e.parentElement.parentElement.parentElement.id;
                /* old reddit submission */
                if (id === "" && isInSubmission(e)) {
                    id = window.location.href.match(/comments\/([A-Za-z0-9]{5,8})\//)[1];
                }
                /* old reddit comment */
                else {
                    id = id.split("_").slice(1).join("_");
                }
                if (id === "") {
                    id = e.parentElement.parentElement.getElementsByClassName("reportform")[0].className.replace(/.*t1/,'t1');
                }
            }
        }
        catch (error) {
            return null;
        }
        return id;
    }

    /* get the container of the comment body */
    function getCommentBodyElement(id, old) {
        var el = null;
        try {
            /* redesign */
            if (!old) {
                var baseEl = document.getElementById(id);
                if (baseEl) {
                  if (baseEl.getElementsByClassName("RichTextJSON-root").length > 0)
                    el = baseEl.getElementsByClassName("RichTextJSON-root")[0];
                  else
                    el = baseEl;
                }
                baseEl = document.querySelector(".Comment."+id);
                if (!el && baseEl) {
                  if (baseEl.getElementsByClassName("RichTextJSON-root").length > 0)
                    el = baseEl.getElementsByClassName("RichTextJSON-root")[0];
                  else
                    el = baseEl.firstElementChild.lastElementChild;
                }
            }
            /* old reddit */
            else {
                if (document.querySelector("form[id*="+id+"] div.md")) {
                    el = document.querySelector("form[id*="+id+"] div.md");
                }
                if (!el) { el = document.querySelector('.report-'+id).parentElement.parentElement; }
            }
        }
        catch (error) {
            return null;
        }
        return el;
    }

    /* check if surrounding elements imply element is in a selftext submission */
    function isInSubmission(e) {
        return e.parentElement.parentElement.className == "top-matter";
    }

    /* check that elements bounds are within the windows bounds */
    function isInViewport(e) {
        var rect = e.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /* create new paragraph containing the body of the original comment/post */
    function showOriginalComment(x, commentBodyElement, postType, body) {
        /* create paragraph element */
        var origBody = document.createElement("p");
        origBody.className = "og";
        /* set text */
        origBody.innerHTML = mdConverter.makeHtml("\n\n### Original "+postType+":\n\n" + body);
        /* paragraph styling */
        origBody.style.opacity = 0.96;
        origBody.style.fontSize = "14px";
        origBody.style.background = "#ffed4c5c";
        origBody.style.padding = "16px";
        origBody.style.color = "inherit";
        origBody.style.lineHeight = "20px";
        commentBodyElement.appendChild(origBody);
        /* scroll into view */
        setTimeout(function(){
            if (!isInViewport(origBody)) {
                origBody.scrollIntoView({behavior: "smooth"});
            }
        }, 500);
    }

    /* create links and define click event */
    function createLink(x) {
        /* create link to "Show orginal" */
        var l = document.createElement("a");
        l.innerText = "Show original";
        l.className = x.className + " showOriginal";
        l.style.textDecoration = "underline";
        l.style.cursor = "pointer";
        l.style.marginLeft = "6px";
        x.parentElement.appendChild(l);
        x.className += " found";
        /* click event */
        l.addEventListener("click", async function () {
            /* allow only 1 request at a time */
            if ((typeof (currentLoading) != "undefined") && (currentLoading !== null)) { return; }
            /* find id of selected comment */
            var id = getId(this, isOldReddit);
						/* create url for getting comment/post from pushshift api */
            var idURL = isInSubmission(this)
												? "https://api.pushshift.io/reddit/search/submission/?ids=" + id + "&sort=desc&sort_type=created_utc&fields=selftext,author,id"
												: "https://api.pushshift.io/reddit/search/comment/?ids=" + id + "&sort=desc&sort_type=created_utc&fields=body,author,id,link_id";
						/* create url for getting author comments/posts from pushshift api */
						var author = this.parentElement.querySelector("a[href*=user]")?.innerText;
						var authorURL = isInSubmission(this)
												? "https://api.pushshift.io/reddit/search/submission/?author=" + author + "&size=200&sort=desc&sort_type=created_utc&fields=selftext,author,id"
												: "https://api.pushshift.io/reddit/search/comment/?author=" + author + "&size=200&sort=desc&sort_type=created_utc&fields=body,author,id,link_id";
					
						/* set loading status */
            currentLoading = this;
            this.innerHTML = "loading...";
						
						/* request from pushshift api */
						await Promise.all([
							fetch(idURL).then((resp) => resp.json()),
							fetch(authorURL).then((resp) => resp.json()),
						])
							.then((responses) => {
									responses.forEach((out) => {
										/* locate the comment that was being loaded */
										var loading = currentLoading;
										// exit if already found
										if (loading.innerHTML === "") { return; }
										/* locate comment body */
										var id = getId(loading, isOldReddit);
										var commentBodyElement = getCommentBodyElement(id, isOldReddit);
										var post = out?.data?.find((post) => post?.id === id?.split("_").pop());
										console.log({author, id, post});
										/* check that comment was fetched and body element exists */
										if (commentBodyElement && post?.body) {
												/* create new paragraph containing the body of the original comment */
												showOriginalComment(x, commentBodyElement, "comment", post.body);
												/* remove loading status from comment */
												loading.innerHTML = "";
										}
										/* check if result has selftext instead of body (it is a submission post) */
										else if (commentBodyElement && post?.selftext) {
												/* create new paragraph containing the selftext of the original submission */
												showOriginalComment(x, commentBodyElement, "post", post.selftext);
												/* remove loading status from post */
												loading.innerHTML = "";
										}
										/* data was not returned or returned empty */
										else if (out?.data?.length === 0) {
												loading.innerHTML = "not found";
												console.log("id: "+id);
												console.log(out);
										}
										/* other issue occurred with displaying comment */
										else {
												loading.innerHTML = "fetch failed";
												console.log("id: "+id);
												console.log(out);
										}
								});
							})
							.catch(function(err) { throw err; });
					
						/* reset status */
          	currentLoading = null;
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
            /* fix styling of created paragraphs in new reddit */
            document.head.insertAdjacentHTML("beforeend", "<style>p.og pre { font-family: monospace; background: #ffffff50; padding: 6px; margin: 6px 0; } p.og h1 { font-size: 2em; } p.og h2 { font-size: 1.5em; } p.og h3 { font-size: 1.17em; } p.og h4 { font-size: 1em; } p.og h5 { font-size: 0.83em; } p.og h6 { font-size: 0.67em; } p.og a { color: lightblue; text-decoration: underline; }</style>");
            /* edited comments */
            editedComments = Array.from(document.querySelectorAll(".Comment div span")).filter(function (x, y, z) {
                return x.parentElement.querySelector("a.showOriginal") === null &&
                    x.innerText.substr(0, 6) == "edited";
            });
            /* include deleted comments */
            editedComments = editedComments.concat(Array.from(document.querySelectorAll(".Comment div span")).filter(function (x, y, z) {
                return x.parentElement.querySelector("a.showOriginal") === null &&
                    x.innerText.substr(0, 15) == "Comment deleted";
            }));
        }
        /* Old Reddit */
        else {
            /* edited comments and submissions */
            editedComments = Array.from(document.querySelectorAll("time")).filter(function (x, y, z) {
                return Array.from(x.classList).indexOf("found") < 0 &&
                    x.title.substr(0,11) == "last edited";
            });
        }
        /* create links */
        editedComments.forEach(function (x, y, z) { createLink(x); });
    }

    /* check for new comments when you scroll */
    window.addEventListener('scroll', function() {
        if (!scriptTimeout) {
            scriptTimeout = setTimeout(findEditedComments, 1000);
        }
    }, true);

    findEditedComments();
})();
