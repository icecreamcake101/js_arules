# js_arules
https://bacloud14.github.io/js_arules/

Basically, this tiny js application accessible through a single page, uses directly the following projects:

https://github.com/seratch/apriori.js
https://github.com/tcorral/JSONC
https://github.com/mholt/PapaParse

Otherwise, it just exposes them to the Web.

### Contribution
Really stuck on this issue here: 
https://github.com/bacloud14/js_arules/issues/6#issuecomment-643604995

Quick editing on Glitch:

https://flannel-eggplant-gram.glitch.me

## Docker Image

This docker image simply serves the sites static content on port 80.

### Build

To build the image simply run `docker build -t IMAGE_NAME .`.

### Run

To start serving the website, run `docker run -d -p 8080:80 IMAGE_NAME .`. Now you can go to http://localhost:8080 and access Interactive Arrays!