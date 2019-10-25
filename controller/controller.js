//dependencies
var express = require("express");
var app = express();
var axios = require("axios");
var cheerio = require("cheerio");
var request = require('request');
var path = require('path');
var db = require("../models");

//Require models
var Comment = require('../models/Note.js');
var Article = require('../models/Article.js');

// Routes

//index
app.get('/', function(req, res) {
    res.redirect('/articles');
});

app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with axios
  axios.get("http://www.echojs.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      //ensures that no empty title or links are sent to mongodb
      if(result.title !== "" && result.link !== ""){
        //check for duplicates
        if(titlesArray.indexOf(result.title) == -1){

          // push the saved title to the array 
          titlesArray.push(result.title);

          // only add the article if is not already there
          Article.count({ title: result.title}, function (err, test){
              //if the test is 0, the entry is unique and good to save
            if(test == 0){

              //using Article model, create new object
              var entry = new Article (result);

              //save entry to mongodb
              entry.save(function(err, doc) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(doc);
                }
              });

            }
      });
  }
  // Log that scrape is working, just the content was missing parts
  else{
    console.log('Article already exists.')
  }

    }
    // Log that scrape is working, just the content was missing parts
    else{
      console.log('Not saved to DB, missing data')
    }
  });
  // after scrape, redirects to index
  res.redirect('/');
});
});

//this will grab every article and populate the DOM
app.get('/articles', function(req, res) {
    //puts newer articles to be on top
    Article.find().sort({_id: -1})
        //send to handlebars
        .exec(function(err, doc) {
            if(err){
                console.log(err);
            } else{
                var art = {article: doc};
                res.render('index', art);
            }
    });
});

// This will get the articles we scraped from the mongoDB in JSON
app.get('/articles-json', function(req, res) {
    Article.find({}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    });
});

//clear all articles for testing purposes
app.get('/clearAll', function(req, res) {
    Article.remove({}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            console.log('removed all articles');
        }

    });
    res.redirect('/articles-json');
});

app.get('/readArticle/:id', function(req, res){
  var articleId = req.params.id;
  var hbsObj = {
    article: [],
    body: []
  };
});

// Create a new note
app.post('/note/:id', function(req, res) {
  var user = req.body.name;
  var content = req.body.comment;
  var articleId = req.params.id;

  //submitted form
  var NoteObj = {
    name: user,
    body: content
  };
 
  //using the Note model, create a new note
  var newNote = new Comment(NoteObj);

  newNote.save(function(err, doc) {
      if (err) {
          console.log(err);
      } else {
          console.log(doc._id)
          console.log(articleId)
          Article.findOneAndUpdate({ "_id": req.params.id }, {$push: {'comment':doc._id}}, {new: true})
            //execute everything
                if (err) {
                    console.log(err);
                } else {
                    res.redirect('/readArticle/' + articleId);
                  }
                };
      });
});

//for getting all saved articles
app.get('/savedArticle', function(req, res){
    Article.find({})
    .where('saved').equals(true)
    .where('deleted').equals(false)
    .exec(function(err, articlesSaved){
        if(err){
          console.log(err);
          res.status(500);
        }else{
          console.log(articlesSaved);
          var savedOnes = {
            articles: articlesSaved
          };
          res.render('saved', savedOnes);
        }
    })
})

//save an article
app.post('/save/:id', function(req,res){
  Article.findByIdAndUpdate(req.params.id, {
        $set: { saved: true}
        },
        { new: true },
        function(error, doc) {
            if (error) {
                console.log(error);
                res.status(500);
            } else {
                res.redirect('/');
            }
        });

})

//delete the saved article
app.post('/deleteArticle/:id', function(req, res){
  Article.findByIdAndUpdate(req.params.id, 
      {$set: { deleted: true}},
      { new: true },
      function(error, doc) {
            if (error) {
                console.log(error);
                res.status(500);
            } else {
                res.redirect('/savedArticle');
            }
      });
})

//delete required note
app.post('/deleteNote/:id', function(req, res){
  Note.findByIdAndRemove(req.params.id, function(error, data) {
            if (error) {
                console.log(error);
                res.status(500);
            } else {
               // res.redirect(`/readArticle/${req.params.id}`);
               res.redirect('/articles');
            }
      });
});

module.exports = app;