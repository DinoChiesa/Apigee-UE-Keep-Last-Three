// ==UserScript==
// @namespace   Apigee
// @name        cull-proxy-revisions
// @description Add a button to cull proxy revisions
// @match       https://apigee.com/platform/*/proxies/*/overview/*
// @grant       none
// @copyright   2016 Apigee Corporation, 2019-2020 Google LLC
// @version     0.1.2
// @run-at      document-end
// @license     Apache 2.0
// ==/UserScript==

/* jshint esversion: 9 */
/* global fetch */

(function (globalScope){
  let timerControl = {},
      orgDropDiv;
  const delayAfterPageLoad = 1240,
        delayAfterElements = 600;

  const log = function() {
          var origArguments = Array.prototype.slice.call(arguments);
          origArguments[0] = "[cull-proxy-revs] " + origArguments[0];
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

  function cleanRevisions(numRevisionsToKeep) {
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
                   let latestRev = revisions[0];
                   revisions.reverse();
                   let revisionsToExamine = revisions.slice(0, revisions.length - numRevisionsToKeep);
                   revisionsToExamine.reverse();
                   return revisionsToExamine
                     .reduce(reducer, Promise.resolve([]))
                     .then(r =>
                           window.location.href =
                           `https://apigee.com/platform/${orgname}/proxies/${apiname}/overview/${latestRev}`);

                 }
               }));
    }
  }

  function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }

  function insertCullButton(div) {
    let countSelectorContainer = document.createElement('div');
    countSelectorContainer.classList.add('revisionSelectorContainer');
    countSelectorContainer.innerHTML = '' +
      '<div id="btn-group-cull-div" class="btn-group">'+
      ' <button class="btn btn-small dropdown-toggle btn-cull" data-toggle="dropdown" href="#">' +
      '  <span>Cull</span>\n' +
      '  <span class="caret"></span>' +
      ' </button>\n' +
      ' <ul class="dropdown-menu cull-selector-menu" style="min-width: 64px;">\n' +
      '  <li>\n' +
      '    <a>\n' +
      '      <span class="rev-count">Keep 1</span>\n' +
      '    </a>\n' +
      '  </li>\n' +
      '  <li>\n' +
      '    <a>\n' +
      '      <span class="rev-count">Keep 3</span>\n' +
      '    </a>\n' +
      '  </li>\n' +
      '  <li>\n' +
      '    <a>\n' +
      '      <span class="rev-count">Keep 5</span>\n' +
      '    </a>\n' +
      '  </li>\n' +
      ' </ul>\n' +
      '</div>\n';

    // the list will open on click; we get that for free.

    insertAfter(div, countSelectorContainer);

    // handlers for the list items
    let items = countSelectorContainer.querySelectorAll('.cull-selector-menu li');
    if (items.length > 0) {
      [...items].forEach(li => {
        li.addEventListener('click', () => {
          let span = li.querySelector('.rev-count');
          // get the integer at the end of the string
          cleanRevisions(Number(span.innerText.slice(5)));
        });
      });
    }
  }

  function tryFixup() {
    getRevisionSelector(insertCullButton);
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

  // ================================================================
  // wait for page to load fully before adding UI elements
  setTimeout(function() {
    waitForPredicate(getRevisionSelector, function() {
      setTimeout(tryFixup, delayAfterElements);
    });
  }, delayAfterPageLoad);

}(this));
