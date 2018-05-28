from HTMLParser import HTMLParser
import mechanize
import pycurl
import re
import sys

fines = 0.00
title = 0
status = 0
fine = 0
books = ""

if len(sys.argv) != 4:
  print "Format: library.py code pin id"
  sys.exit()

code = sys.argv[1]
pin = sys.argv[2]
id = sys.argv[3]
url = "http://www.elgar.govt.nz/patroninfo~S1/" + id + "/items?currentsortorder=current_duedate"

# Create class to handle parsing of data
class MyHTMLParser(HTMLParser):

  def handle_starttag(self, tag, attrs):
    global title
    global status
    global fine

    for attr in attrs:
#      print attr

      if "patFuncTitleMain" in attr:
        title = 1
      if "patFuncStatus" in attr:
        status = 1
      if "patFuncFinesTotalAmt" in attr:
        fine = 1

  def handle_data(self, data):
    global books
    global fines
    global fine
    global status
    global title
    if "in unpaid fines and bills" in data or fine == 1:
      data = re.sub("[^0-9.-]", "", data)
      fines = float(data)
      fine = 0
    if title == 1:
      if len(books) != 10:
        books = books  + ","
      books = books + "{\"name\":\"" + data.replace("\n", "")
      title = 0
    if status == 1:
      data = re.sub("[^0-9.-]", "", data)
      books = books + "\",\"due\":\"" + data + "\"}"
      status = 0

  
parser = MyHTMLParser()

# Connect to the site, log in and extract content
br = mechanize.Browser()
br.set_handle_robots(False)
br.open(url)
br.select_form("patform")
br.form.find_control("code").disabled = False
br.form.find_control("pin").disabled = False
br["code"] = code
br["pin"] = pin
br.form.enctype = "application/x-www-form-urlencoded"
response = br.submit()
content = response.read()

#print content

#sys.exit()

response.close()
br.close()

# parse the content through the html parser
books = books + "{\"books\":["
parser.feed(content)
books = books +  "], \"fines\":" + str(fines) + "}"

print books.replace("\n", "")

sys.exit()


