use warnings;
use strict;

use JSON::XS;

my $statesFile = $ARGV[0];
my $netOrnodes = $ARGV[1];

open(STATESFILE, $statesFile);
my @stateslines = <STATESFILE>;
close(STATESFILE);


my @nodenames;
my %visitedNode;
my $hrow = $stateslines[0];
chomp($hrow);
my %hcol;
my @hfields = split(/\t/, $hrow);
for(my $i=0;$i<scalar(@hfields);$i++){
	$hcol{$hfields[$i]}=$i;
}

my $indexCounter=0;
my %nodeIndex;
for(my $i=1; $i<scalar(@stateslines);$i++){
	my $line = $stateslines[$i];
	chomp($line);
	my @fields = split(/\t/, $line);
	
	# Keeping track of all the nodes
	if(!defined($visitedNode{$fields[0]})){
		push(@nodenames, $fields[0]);
		$nodeIndex{$fields[0]}=$indexCounter;
		$indexCounter++;
		$visitedNode{$fields[0]}=1;
	}
	if(!defined($visitedNode{$fields[1]})){
		push(@nodenames, $fields[1]);
		$nodeIndex{$fields[1]}=$indexCounter;
		$indexCounter++;
		$visitedNode{$fields[1]}=1;
	}
}


# Printing
if($netOrnodes eq "net"){
	my @nodes;
	foreach my $nodename (@nodenames){
		my %thisnode;
		$thisnode{"Entry"}=$nodename;
		$thisnode{"index"}=$nodeIndex{$nodename};
		push(@nodes,\%thisnode);
	}

	my @links;
	for(my $i=1; $i<scalar(@stateslines);$i++){
		my $line = $stateslines[$i];
		chomp($line);
		my @fields = split(/\t/, $line);
		my %thislink;
		$thislink{"source"}=$nodeIndex{$fields[0]};
		$thislink{"target"}=$nodeIndex{$fields[1]};
		$thislink{"state"}=$fields[$hcol{"STATE"}];
		$thislink{"score"}=$fields[$hcol{"ENET_RSQ"}];
		push(@links,\%thislink);
	}
	
	my %result;
	$result{"nodes"}=\@nodes;
	$result{"links"}=\@links;
	print encode_json(\%result);
}elsif($netOrnodes eq "nodes"){
	my @nodes;
	foreach my $nodename (@nodenames){
		my %thisnode;
		$thisnode{"description"}=$nodename;
		$thisnode{"value"}=$nodename;
		$thisnode{"tokens"}=$nodename;
		push(@nodes,\%thisnode);
	}
	my %result;
	print encode_json(\@nodes);
}
