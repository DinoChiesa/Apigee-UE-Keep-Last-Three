# Apigee Tampermonkey: Clean all but last three Proxy Revisions

This is a [Tampermonkey](https://tampermonkey.net/) script that tweaks
the [Apigee](https://apigee.com) UI to clean all but the most recent three
revisions of an API Proxy.

![screengrab](img/keep-last-three.gif)


## What is Tampermonkey?

Tampermonkey is a browser extension, that works on Firefox, Chrome, Safari,
etc. It is a pre-requisite to get this tweak of the Edge UI.

Tampermonkey allows the running of "user scripts" on webpages from particular
domains. It's a way of augmenting or modifying the behavior of a webpage, using
code provided by or approved by the user. The modification could be as simple as
changing the color or styling of a webpage; or it could be as complex as adding
new behavior or UI elements on a web page, or even adding new pages.

The user must install the custom script, and associate it to a particular domain
or set of domains. Thereafter, all pages loaded from those domains will run that
script.


## OK, How does this specific Tweak work?

The script registers for apigee.com . When it finds that the current page
displays the proxy overview, it adds a button to the proxy editor toolbar,
labeled "Clean". When clicked, that button selects all but the final 3
revisions, and removes each revision if it is not deployed. 

Then, it refreshes the page.

The script is set to run after a brief delay after initial page load.

## Installing the script

If you don't have Tampermonkey loaded for your browser, you must first visit
[tampermonkey.net](https://tampermonkey.net/) and install it.

Then,

1 Use the tampermonkey menu to add a new script.
  <img src="img/tm-add-new-script.png" width='308px'>

2. copy-paste the [keep-last-three.user.js](lib/keep-last-three.user.js) script into place.

3. Reload the browser tab that is displaying the proxy.

4. Done.


## License

This user script is licensed under the [Apache 2.0 license](LICENSE).


## Compatibility

This user script works with Firefox, and Chrome on MacOS X.
It *ought to* work just fine on other combinations of browsers.
