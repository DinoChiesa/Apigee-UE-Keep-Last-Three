// ==UserScript==
// @namespace   Apigee
// @name        keep-last-three
// @description Add button to remove all but last three revisions
// @match       https://apigee.com/platform/*/proxies/*/overview/*
// @grant       none
// @copyright   2016 Apigee Corporation, 2019-2020 Google LLC
// @version     0.1.1
// @run-at      document-end
// @license     Apache 2.0
// ==/UserScript==

/* jshint esversion: 9 */
/* global fetch */

(function (globalScope){
  let timerControl = {},
      orgDropDiv;
  const numRevisionsToKeep = 3,
        delayAfterPageLoad = 1800,
        delayAfterElements = 800;

  const log = function() {
          var origArguments = Array.prototype.slice.call(arguments);
          origArguments[0] = "[keep-last-three] " + origArguments[0];
          Function.prototype.apply.apply(console.log, [console, origArguments]);
        };

  function waitForPredicate(predicate, action, controlKey) {
    controlKey = controlKey || Math.random().toString(36).substring(2,15);
    let interval = timerControl[controlKey];
    let found = predicate();

    if (found) {
      action(found);
      if (interval) {
        clearInterval (interval);
        delete timerControl[controlKey];
      }
    }
    else {
      if ( ! interval) {
        timerControl[controlKey] = setInterval ( function () {
          waitForPredicate(predicate, action, controlKey);
        }, 300);
      }
    }
  }

  function getElementsByTagAndClass(root, tag, clazz) {
    var nodes = root.getElementsByClassName(clazz);
    if (tag) {
      var tagUpper = tag.toUpperCase();
      nodes = Array.prototype.filter.call(nodes,
                                          testElement => testElement.nodeName.toUpperCase() === tagUpper );
    }
    return nodes;
  }

  function getCsrfHeader() {
    let nodes = document.getElementsByTagName('csrf');
    if (nodes && nodes.length == 1) {
      let csrf = nodes[0];
      return csrf.getAttribute('data');
    }
    return null;
  }

  function cleanRevisions(event) {
    log('cleanRevisions');
    const re1 = new RegExp('^https://apigee.com/platform/([^/]+)/proxies/([^/]+)/overview/([^/]+)$');
    let match = re1.exec(window.location.href);
    if (match) {
      let orgname = match[1],
          apiname = match[2],
          currentRevision = match[3],
          csrfHeader = getCsrfHeader(),
          baseHeaders = {
            'Accept': 'application/json',
            'X-Apigee-CSRF': csrfHeader,
            'X-Requested-With': 'XMLHttpRequest'
            //'X-Restart-URL': 'https://apigee.com' + href
          };
      let apiUrl = `https://apigee.com/ws/proxy/organizations/${orgname}/apis/${apiname}`;
      let revisionsUrl = `${apiUrl}/revisions`;
      //log('getting revisions...');
      return fetch(revisionsUrl, { method:'GET', headers: baseHeaders })
        .then( res =>
               (res.status != 200) ? null :
               res.json()
               .then(revisions => {
                 if (revisions && revisions.length > numRevisionsToKeep) {
                   const reducer = (p, revision) =>
                     p.then( accumulator => {
                       let revisionUrl = `${revisionsUrl}/${revision}`;
                       let deploymentsUrl = `${revisionUrl}/deployments`;
                       return fetch(deploymentsUrl, { method:'GET', headers: baseHeaders })
                         .then(res =>
                               (res.status != 200) ? null :
                               res.json()
                               .then(r => {
                                 //console.log(JSON.stringify(r));
                                 if (r.environment && r.environment.length == 0) {
                                   // not deployed, so delete
                                   return fetch(revisionUrl, { method:'DELETE', headers: baseHeaders });
                                 }
                                 return null;
                               }))
                         .then( result => [ ...accumulator, {revision, result} ] );
                     });

                   revisions.sort( (a, b) => b - a );
                   revisions.reverse();
                   let revisionsToExamine = revisions.slice(0, revisions.length - numRevisionsToKeep);
                   revisionsToExamine.reverse();
                   return revisionsToExamine
                     .reduce(reducer, Promise.resolve([]))
                     .then(r => window.location.reload(true) );
                 }
               }));
    }
  }

  function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }

  function insertKeepButton(div) {
    let newdiv = document.createElement('div');
    newdiv.innerHTML ='<button class="btn btn-small cleanBtn" ' +
      'id="btn-remove-all-but-latest-3" ' +
      'style="float: left; margin-left: 6px;" ' +
      'title="Keep Latest 3 Revisions" >Clean</button>';
    newdiv.addEventListener('click', cleanRevisions);
    insertAfter(div, newdiv);
  }

  function tryFixup() {
    getRevisionSelector(insertKeepButton);
  }

  function getRevisionSelector(cb) {
    let nodes = getElementsByTagAndClass(document, 'div', 'revisionSelectorContainer');
    if (nodes && nodes.length == 1) {
      if (cb) {
        return cb(nodes[0]);
      }
      return nodes[0];
    }
    return null;
  }

  // ====================================================================
  // This kicks off the page fixup logic
  setTimeout(function() {
    waitForPredicate(getRevisionSelector, function() {
      setTimeout(tryFixup, delayAfterElements);
    });
  }, delayAfterPageLoad);

}(this));
