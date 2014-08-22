use warnings;
use strict;

use JSON::XS;

my $statesFile = $ARGV[0];
my $netOrnodes = $ARGV[1];
my $nodeInfoCytoscape = $ARGV[2];

my %histoneMods = ("H3K9me3",1, "H3K9ac",1, "H3K27ac",1,"H3K79me2",1,"H3K27me3",1,
"H3K4me2",1,"H3K36me2",1,"H3K36me3",1,"H4K20me3",1,"H3K4me3",1,"H3K4me1",1);

my %dnaMeth = ("5fC",1,"5hmC",1,"5mC",1);

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

my $histoneTotal=0;
my $methylTotal=0;
foreach my $nodename (@nodenames){
  my $type = getType($nodename, \%histoneMods, \%dnaMeth);
  if($type eq "histone"){
    $histoneTotal++;
  }elsif($type eq "methylation"){
    $methylTotal++;
  }
}

# Printing
if($netOrnodes eq "net"){
	my @nodes;
  my %typeCounter;
  foreach my $nodename (@nodenames){
		my %thisnode;
		$thisnode{"Entry"}=$nodename;
		$thisnode{"index"}=$nodeIndex{$nodename};
    $thisnode{"shape"}=getShape($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"size"}=getSize($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"nodecolor"}=getColor($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"fixed"}=getFixed($nodename, \%histoneMods, \%dnaMeth);
    my $type = getType($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"type"}= $type;
    if(!defined($typeCounter{$type})){
      $typeCounter{$type}=1;
    }else{
      $typeCounter{$type} = $typeCounter{$type}+1;
    }
    if($type eq "histone"){
      $thisnode{"y"}=(($typeCounter{$type}/($histoneTotal + 2)) + (0.5 / ($histoneTotal+2)));
    }elsif($type eq "methylation"){
      $thisnode{"y"}=(($typeCounter{$type}/($methylTotal+ 2)) + (0.5 / ($methylTotal+2)));
    }else{
      $thisnode{"y"}=0.5;
    }
    $thisnode{"x"}=getX($nodename, \%histoneMods, \%dnaMeth);
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
    if($fields[$hcol{"ENET_B"}] != 1){
  		$thislink{"type"}="negative";
    }else{
  		$thislink{"type"}="positive";
    }
		push(@links,\%thislink);
	}
	
	my %result;
	$result{"nodes"}=\@nodes;
	$result{"links"}=\@links;
	print encode_json(\%result);
}elsif($netOrnodes eq "nodes"){
	my @nodes;
  my %typeCounter;
  for(my $i=0;$i<scalar(@nodenames);$i++){
    my $nodename = $nodenames[$i];
		my %thisnode;
		$thisnode{"description"}=$nodename;
		$thisnode{"value"}=$nodename;
		$thisnode{"tokens"}=$nodename;
		$thisnode{"Entry"}=$nodename;
		$thisnode{"index"}=$nodeIndex{$nodename};
    $thisnode{"shape"}=getShape($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"size"}=getSize($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"nodecolor"}=getColor($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"fixed"}=getFixed($nodename, \%histoneMods, \%dnaMeth);
    my $type = getType($nodename, \%histoneMods, \%dnaMeth);
    $thisnode{"type"}= $type;
    if(!defined($typeCounter{$type})){
      $typeCounter{$type}=1;
    }else{
      $typeCounter{$type} = $typeCounter{$type}+1;
    }
    if($type eq "histone"){
      $thisnode{"y"}=(($typeCounter{$type}/($histoneTotal + 2)) + (0.5 / ($histoneTotal+2)));
    }elsif($type eq "methylation"){
      $thisnode{"y"}=(($typeCounter{$type}/($methylTotal+ 2)) + (0.5 / ($methylTotal+2)));
    }else{
      $thisnode{"y"}=0.5;
    }
    $thisnode{"x"}=getX($nodename, \%histoneMods, \%dnaMeth);
		push(@nodes,\%thisnode);
      push(@nodes,\%thisnode);
	}
	my %result;
	print encode_json(\@nodes);
}

sub getShape{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id})){
    return("3");
  }elsif(defined($dnaMeth{$id})){
    return("2");
  }else{
    return("6");
  }
}

sub getSize{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id})){
    return("600");
  }elsif(defined($dnaMeth{$id})){
    return("600");
  }else{
    return("300");
  }
}

sub getColor{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id})){
    return("3");
  }elsif(defined($dnaMeth{$id})){
    return("1");
  }else{
    return("2");
  }
}

sub getType{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id})){
    return("histone");
  }elsif(defined($dnaMeth{$id})){
    return("methylation");
  }else{
    return("proteins");
  }
}

sub getX{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id})){
    return(0.25);
  }elsif(defined($dnaMeth{$id})){
    return(0.75);
  }else{
    return(0.5);
  }
}


sub getFixed{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id}) || defined($dnaMeth{$id})){
    return(bless( do{\(my $o = 1)}, 'JSON::XS::Boolean' ));
  }else{
    return(bless( do{\(my $o = 0)}, 'JSON::XS::Boolean' ));
  }
}