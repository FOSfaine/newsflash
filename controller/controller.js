var express = require("express");
var app = express();
var axios = require("axios");
var cheerio = require("cheerio");
var request = require('request');
var path = require('path');
var db = require("../models");

var Note = require('../models/Note.js');
var Article = require('../models/Article.js');

app.get('/', function(req, res) {
    res.redirect('/articles');
});

app.get("/scrape", function(req, res) {

  request('http://www.echojs.com/', function(error, response, html) {

    var $ = cheerio.load(html);
    var titlesArray= [];

    $("article h2").each(function(i, element) {
      var result = {};

      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");

      if(result.title !== "" && result.link !== ""){
        if(titlesArray.indexOf(result.title) == -1){

          titlesArray.push(result.title);
          Article.count({ title: result.title}, function (err, test){
            if(test == 0){
              var entry = new Article (result);
              entry.save(function(err, doc) {
                if (err) {
                  console.log(err);
                } else {
                  console.log(doc);
                }
              });

            }
        });
    }}
  });
  res.redirect('/');
});
});

app.get('/articles', function(req, res) {
    Article.find().sort({_id: -1})
        .exec(function(err, doc) {
            if(err){
                console.log(err);
            } else{
                var art = {article: doc};
                res.render('index', art);
            }
    });
});

app.get('/articles-json', function(req, res) {
    Article.find({}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            res.json(doc);
        }
    });
});

app.get('/readArticle/:id', function(req, res){
  var link = req.params.link;
  res.redirect(link);
});

app.post('/note/:id', function(req, res) {
  var user = req.body.name;
  var content = req.body.note;
  var articleId = req.params._id;

  var NoteObj = {
    name: user,
    body: content
  };
 
  var newNote = new Note (NoteObj);

  newNote.save(function(err, doc) {
      if (err) {
          console.log(err);
      } else {
          console.log(doc._id)
          console.log(articleId)
          Article.findOneAndUpdate({ "id": req.params._id }, {$push: {'note':doc._id}}, {new: true})
                if (err) {
                    console.log(err);
                } else {
                    res.redirect('/readArticle/' + articleId);
                  }
                };
      });
});

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

app.post('/save/:id', function(req,res){
  Article.findByIdAndUpdate(req.params._id, {
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

app.post('/deleteNote/:id', function(req, res){
  Note.findByIdAndRemove(req.params._id, function(error, data) {
            if (error) {
                console.log(error);
                res.status(500);
            } else {
               res.redirect('/articles');
            }
      });
});

module.exports = app;