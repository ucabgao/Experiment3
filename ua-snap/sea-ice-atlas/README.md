# Sea Ice Atlas

Web app for exploring arctic sea ice extent.

### Dependencies

#### Mac OS X

First install:

* Xcode (you may also need to install the "Command Line Tools" package from the Xcode -> Preferences -> Downloads window)
* Homebrew

Then install Ruby, Compass, and Node with the following commands:

```bash
brew install ruby
gem install compass
brew install node
```

### Installation

```bash
git clone git@github.com:ua-snap/sea-ice-atlas.git
cd sea-ice-atlas
npm install
bower install
```

The application also needs a configuration file set up.  From a fresh checkout:

```
cp config.json.example config.json
```

Then, edit the ```config.json``` file to specify port & database connection.

### Building the project

*Building the project* means being able to "compile" all the source into a web app you can use and run.  To run a development environment, it's ```grunt ```.

Important stuff grunt is doing for us:

 * Takes all the javascript code and turns it into a single optimized file,
 * Takes all LESS code (ours and others) and compiles it to a single file.

*One nice but flaky thing* is that when you save changes to files, the build system will try and reload your current browser page.  When this works, it's wicked magic because it's like "live editing."  The sad news is that sometimes it's late/slow and won't work.  In some cases, you need to manually retrigger Grunt so it is _definitely_ rebuilding all the styles + code.

### Important files, locations

For *GUI development*, here's how things roll:

 * Server-side Jade templates.  Layout + "pages" live in the ```views/*.jade``` files.  For changing static text or layout, this is probably the right place to start.
 * Client-side JST templates.  These only currently lurk in the Explore page, and they're small chunks of HTML that get assembled for the "application" behavior.  These files dwell in ```src/scripts/templates``` directory. 
 * Styling is done by taking the Bootstrap 3.0 source LESS files, then adding/overriding the styling to build a single final CSS file.  Our custom LESS files live in ```src/less```.
 * The public web root is ```/public```.  This means, if you want to add an image, you'd add the file in the repository to ```/public/img/photo.jpg``` then reference it with this path: ```/img/photo.jpg```.  Jade code: ```img(src='/img/photo.jpg')```.  
 * Adding a new "page" means that you have to tell Express (the web framework) how to wire things up.  For "normal static pages" this can be made a lot more awesome + straightforward, but what we've got is OK for this small site.

#### Some normal types of changes as examples

*Scenario*: I want to change some text and an image on the Glossary page.  I'd open ```/views/glossary.jade``` and update content there, adding any images to ```/public/img```.

*Scenario*: I need to change the footer text.  This text is in the layout, since it's included in every page.  I'd open ```views/layout.jade``` and make changes as required.

*Scenario*: I want to override or change some styling choice site-wide.  I'd start by seeing if Bootstrap has this set up as a "variable" by checking in the Bootstrap source code, which will be in ```bower_components/bootstrap/less/variables.less```.  Bootstrap's set up to apply the effects of these variables globally, which is why I start by looking at what they've got.  I may fiddle around with them inside that file, but when I confirm I've found the right thing, I'd open ```src/less/variables.less``` and make my changes there, so I'm not changing anything in the Bootstrap original source.

*Scenario*: I want to apply specific styles to one section of a page.  I'd identify how to write LESS rules that target that section (maybe wrap it in a div with a specific ID or class), then I'd add my LESS code to ```/src/less/style.less```.

### Jenkins

*Out of date!*

Upon changes to the master branch (checked every 5 minutes), Jenkins runs ```grunt``` then copies the contents of the ```dist/``` to Icarus.  One gotcha: the "publish over ssh" plugin chokes on removing prefixes from dotfiles (in this case, ```.htaccess```) so those files are omitted from being copied to the production server.
