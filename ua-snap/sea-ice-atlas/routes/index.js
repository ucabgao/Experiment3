
/*
 * GET various pages.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Sea Ice Atlas' });
};

exports.explore = function(req, res) { res.render('explore', { title: 'Sea Ice Atlas: Explore', active:'explore' }); }
exports.glossary = function(req, res) { res.render('glossary', { title: 'Sea Ice Atlas: Glossary', active:'glossary' }); }
exports.download = function(req, res) { res.render('download', { title: 'Sea Ice Atlas: Download', active:'download' }); }
exports.about = function(req, res) { res.render('about', { title: 'Sea Ice Atlas: About', active:'about' }); }
exports.credits = function(req, res) { res.render('credits', { title: 'Sea Ice Atlas: Credits' }); }
exports.disclaimer = function(req, res) { res.render('disclaimer', { title: 'Sea Ice Atlas: Disclaimer' }); }