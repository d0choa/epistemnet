use warnings;
use strict;

use JSON::XS;

my $statesFile = $ARGV[0];
my $netOrnodes = $ARGV[1];
my $geoCodesFile = $ARGV[2];
my $complexesFile = $ARGV[3];
my $mappingsFile = $ARGV[4];

my %histoneMods = ("H3K9me3",1, "H3K9ac",1, "H3K27ac",1,"H3K79me2",1,"H3K27me3",1,
"H3K4me2",1,"H3K36me2",1,"H3K36me3",1,"H4K20me3",1,"H3K4me3",1,"H3K4me1",1, "H2Aub1", 1, "H2AZ", 1);

my %dnaMeth = ("5fC",1,"5hmC",1,"5mC",1);

my %CTCF = ("CTCF",1);

my %stateType = ("1","Elongation","2","Elongation","3","Elongation","4","Elongation","5","Elongation","6","Heterochromatin","7","Heterochromatin","8","Heterochromatin","9","Heterochromatin","10","Heterochromatin","11","Enhancer","12","Enhancer","13","Enhancer","14","Enhancer","15","Activation","16","Activation","17","Activation","18","Repression","19","Repression","20","CTCF/Insulator");

my %geo = %{getGEOFile($geoCodesFile)};
my %complexes = %{getComplexesFile($complexesFile)};

my ($genenamesref, $descriptionref, $ensemblgeneref, $ensemblproteinref, $uniprotref) = getMappings($mappingsFile);
my %genenames = %{$genenamesref};
my %description = %{$descriptionref};
my %ensemblgene = %{$ensemblgeneref};
my %ensemblprotein = %{$ensemblproteinref};
my %uniprot = %{$uniprotref};

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
    $thisnode{"nodecolor"}=getColor($nodename, \%histoneMods, \%dnaMeth,\%complexes);
    $thisnode{"complex"}=getComplex($nodename, \%complexes);
    $thisnode{"geo"}=getGEO($nodename, \%geo);
    $thisnode{"gene_names"}=getGeneNames($nodename, \%genenames);
    $thisnode{"description"}=getDescription($nodename, \%description);
    $thisnode{"ensemblgene"}=getEnsemblGene($nodename, \%ensemblgene);
    $thisnode{"ensemblprotein"}=getEnsemblProtein($nodename, \%ensemblprotein);
    $thisnode{"uniprot"}=getUniprot($nodename, \%uniprot);
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
		$thislink{"stateType"}=$stateType{$fields[$hcol{"STATE"}]};
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
		push(@nodes,$nodename);
    @nodes = sort @nodes;
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
  my %complex = %{$_[3]};
  
  my %complexColor;
  my %visitedComplex;
  my $colorCounter=5;
  my @keys = keys %complex;
  foreach my $key (@keys){
    my $complexName = $complex{$key};
    if(!defined($visitedComplex{$complexName})){
      $complexColor{$complexName}=$colorCounter;
      $colorCounter++;
      $visitedComplex{$complexName}=1;
    }
  }
  
  if(defined($histoneMods{$id})){
    return("3");
  }elsif(defined($dnaMeth{$id})){
    return("1");
  }elsif(defined($CTCF{$id})){
    return("4");
  }elsif(defined($complexes{$id})){
    return($complexColor{$complexes{$id}});
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
    return(0.50);
  }elsif(defined($dnaMeth{$id})){
    return(0.82);
  }elsif(defined($CTCF{$id})){
    return(0.16);
  }else{
    return(0.5);
  }
}

sub getFixed{
  my $id=$_[0];
  my %histoneMods = %{$_[1]};
  my %dnaMeth = %{$_[2]};
  
  if(defined($histoneMods{$id}) || defined($dnaMeth{$id}) || defined($CTCF{$id})){
    return(bless( do{\(my $o = 1)}, 'JSON::XS::Boolean' ));
  }else{
    return(bless( do{\(my $o = 0)}, 'JSON::XS::Boolean' ));
  }
}

sub getGEO{
  my $id=$_[0];
  my %geo=%{$_[1]};
  if(defined($geo{$id})){
    return($geo{$id});
  }else{
    return("none");
  }
}

sub getGeneNames{
  my $id=$_[0];
  my %genenames=%{$_[1]};
  if(defined($genenames{$id})){
    return(join(" // ", @{$genenames{$id}}));
  }else{
    return("None");
  }
}

sub getDescription{
  my $id=$_[0];
  my %description=%{$_[1]};
  if(defined($description{$id})){
    return($description{$id});
  }else{
    return("None");
  }
}

sub getEnsemblGene{
  my $id=$_[0];
  my %ensemblgene=%{$_[1]};
  if(defined($ensemblgene{$id})){
    return($ensemblgene{$id});
  }else{
    return("None");
  }
}

sub getEnsemblProtein{
  my $id=$_[0];
  my %ensemblprotein=%{$_[1]};
  if(defined($ensemblprotein{$id})){
    return($ensemblprotein{$id});
  }else{
    return("None");
  }
}

sub getUniprot{
  my $id=$_[0];
  my %uniprot=%{$_[1]};
  if(defined($uniprot{$id})){
    return($uniprot{$id});
  }else{
    return("None");
  }
}

sub getComplex{
  my $id=$_[0];
  my %complex=%{$_[1]};
  if(defined($complex{$id})){
    return($complex{$id});
  }else{
    return("None");
  }
}

sub getGEOFile{
  my $inputFile = $_[0];
  
  open(INFILE, $inputFile);
  my @inlines = <INFILE>;
  close(INFILE);
  
  my %geo;
  for(my $i=1;$i<scalar(@inlines);$i++){
    my $line = $inlines[$i];
    chomp($line);
    my @fields = split(/,/,$line);
    $geo{$fields[0]}=$fields[1];
  }
  return(\%geo);
}

sub getComplexesFile{
  my $inputFile = $_[0];
  open(INFILE, $inputFile);
  my @inlines = <INFILE>;
  close(INFILE);
  
  my %complexes;
  for(my $i=1;$i<scalar(@inlines);$i++){
    my $line = $inlines[$i];
    chomp($line);
    my @fields = split(/\t/, $line);
    if(defined($fields[0])){
      $complexes{$fields[0]}=$fields[1];
    }
  }
  return(\%complexes);
}

sub getMappings{
  my $mappingsFile = $_[0];
  
  my %genenames;
  my %description;
  my %ensemblgene;
  my %ensmeblprotein;
  my %uniprot;
  
  open(INFILE, $mappingsFile);
  my @inlines = <INFILE>;
  close(INFILE);
  
  for(my $i=1;$i<scalar(@inlines);$i++){
    my $line = $inlines[$i];
    chomp($line);
    my @fields = split(/\t/, $line);
    push(@{$genenames{$fields[0]}}, $fields[1]);
    if($fields[2] ne ""){
		my @allalternatives = split(" ", $fields[2]);
		foreach my $altern (@allalternatives){
	        push(@{$genenames{$fields[0]}}, $altern);
		}
    }
    $description{$fields[0]}=$fields[3];
    $ensemblgene{$fields[0]}=$fields[4];
    $ensemblprotein{$fields[0]}=$fields[5];
    $uniprot{$fields[0]}=$fields[6];
  }
  return(\%genenames, \%description, \%ensemblgene, \%ensemblprotein, \%uniprot);
}