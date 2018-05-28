Auckland Libraries Data 
=======================

A NodeJS wrapper on a python web scraper of Auckland Central Libraries web page giving RESTful access to books taken, fines, and the ability to push notifications using PushBullet for books about to become due

library.py does the actual scraping, and requires mechanize, pycurl.

server.js is the node script that exposes the rest endpoints for query. Details in the script on how to query it.
