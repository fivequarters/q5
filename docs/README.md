# Introduction

This repository includes all user-facing release notes for Fusebit products and services.

# Running locally

(Optional) To run things locally:

1. Put this in your `.bash_profile`:

```
export GEM_HOME=$HOME/.gem
export PATH=$PATH:$HOME/.gem/bin
```

2. `gem install bundler jekyll`
3. In the `/docs` folder of this repo `bundle install`
4. `bundle exec jekyll serve`
5. Navigate over to http://localhost:4000

# Deployment

To deploy to <https://fivequarters.github.io/q5>, just push to this repo and GH pages will automatically deploy.
