#!/bin/env perl

use strict;
use warnings;
use Getopt::Long;
use Template;
use JSON;
use Data::Dumper;

my $mapfile = "hsia.map";
my $cachefile = "hsia-cache.cfg";
my $path = "/var/www/html";
my $imageurl = "hsia";
my $server = "tiles.snap.uaf.edu";
my $help = 0;

# process command line flags
my $result = GetOptions(
			"mapfile=s" => \$mapfile,
			"path=s" => \$path,
			"imageurl=s" => \$imageurl,
			"server=s" => \$server,
			"help" => \$help
);

if ($help){
	print "Options:\n";
	print "\t--mapfile,-m\t\tname of the output file\n";
	print "\t--path,-p\t\tlocation of the mapfile\n";
	print "\t--imageurl,-i\t\tlocation of the image url, relative from web\n";
	print "\t--server,-s\t\tlocation of the hosting server of mapserv\n";
	print "\t--help,-h\t\tdisplay this help message\n";
	exit;
}

# prepare templates
my $tt = Template->new({
    INCLUDE_PATH => './templates',
    INTERPOLATE  => 1,
}) || die "$Template::ERROR\n";

# process 'layer' section
my $layers;
my $cachelayers;

foreach my $year (1953..2012) {
	foreach my $month ("01".."12") {

		my $layerName = "seaice_conc_sic_mean_pct_weekly_ak_${year}_${month}_average";
		my $layerInformation = {
			layerName => $layerName
		};

		$tt->process('layer', $layerInformation, \$layers) || die $tt->error(), "\n";

		#generate tile cache layers
		my $cacheVariable = {
			layerName => $layerName
		};
		$tt->process('cachelayer', $cacheVariable, \$cachelayers);

	}
}

# Open the new mapfile
open (my $fh, ">", $mapfile) or die $!;

# Interpolate into the rest of the mapfile & save!
my $mapfileInformation = {
	layers => $layers,
	path => $path,
	imageurl => $imageurl,
	wmsOnlineResource => "$server/cgi-bin/mapserv?map=$mapfile"
};

$tt->process('mapfile', $mapfileInformation, $fh ) || die $tt->error(), "\n";

close ($fh);

# Open the new tilecache config file
open (my $cf, ">", "tilecache.cfg") or die $!;

my $cachefileInformation = {
	cachelayers => $cachelayers
};
$tt->process('cachefile', $cachefileInformation, $cf ) || die $tt->error(), "\n";

close ($cf);

exit 313;
