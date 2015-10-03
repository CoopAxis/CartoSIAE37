#!/usr/bin/env php
<?php 
/**
 * make-siae.php
 * 
 * Build a json file with "codes ROME"
 * download: http://www.pole-emploi.fr/candidat/le-code-rome-et-les-fiches-metiers-@/article.jspz?id=60702
 * 
 * Only keep whitch exists in another file
 */

error_reporting(E_ALL);

require_once('/home/cyrille/Code/libs/php.libs/PHPExcel-1.8.1/Classes/PHPExcel.php');

// /home/cyrille/Taf/Carto SIAE/www/data
define( 'DIR', __DIR__ );

$config = array(

	// ROME codes referential
	'romes_json' => DIR.'/Codes_ROME-tree.xls.json',

	// SIAE input file
	'siae_filename' => DIR.'/Codes-ROME-SIAE-avec-AI-2013_par-MDS-xlsx.geocoded.ods',
	'siae_filename_fileType' => 'OOCalc' ,

	'siae_filename_rowsMax' => 1000, // Because SIAE file contains empty lines anywhere ...
	'siae_filename_rowsOffset' => 1,

	// Result of process: existing ROME codes tree found in SIAE input file
	'output_romes' => DIR.'/siae-romes.json',
	// Result of process: List of SIAE (with a ROME codes index)
	'output_siae' => DIR.'/siae.json' ,

	'cols' => array(
		// Domaine, Sous-domaine, Intitulé, Code ROME, Structure(s), Adresse, CP, Ville, Tél, structure, Mail
		// Type de Structure IAE, Commune du siège, MDS du siège,
		// Nombre d'heures travaillées dans l'année, Nombre de salariés en insertion, Total heures travaillées par la structure, % de l'activité de la structure
		'metier' => 2,
		'code rome' => 3,
		'nom' => 4,
		'adress' => 8,
		'LatLon'=>10,
		'phone'=>11,'mail'=>12,'type'=>13
	)

);

$romesJson = json_decode( file_get_contents($config['romes_json']) );

$objReader = PHPExcel_IOFactory::createReader($config['siae_filename_fileType']);
$objReader->setReadDataOnly(true);
$objPHPExcel = $objReader->load($config['siae_filename']);
$sheet = $objPHPExcel->getActiveSheet();

extractSiaeAndRomes( $sheet );

function extractSiaeAndRomes( $sheet )
{
	global $config ;
	
	$rowMax = $config['siae_filename_rowsMax'] ;
	$rowOffset = $config['siae_filename_rowsOffset'] ;

	// for file 'output_romes'
	$siaeRomesTree = array();

	// for file 'output_siae'
	$siae = array();
	// for file 'output_siae'
	$siaeRomesIndex = array();
	// for file 'output_siae'
	$rome2job = array();

	// local index
	$siaeNomIndex = array();

	for( $rowIdx=1+$rowOffset; $rowIdx<$rowMax; $rowIdx++)
	{

		$rome = $sheet->getCellByColumnAndRow( $config['cols']['code rome'], $rowIdx )->getValue();
		$nom = $sheet->getCellByColumnAndRow( $config['cols']['nom'], $rowIdx )->getValue();

		// the SIAE file contains empty lines ...
		if( empty($rome) )
			continue ;
		$rome = strtoupper($rome);

		// if not exists init arrays $siaeNomIndex and $siae
		if( ! isset($siaeNomIndex[$nom]) )
		{
			echo $rowIdx, ' ', $nom, "\n";

			$latlon = $sheet->getCellByColumnAndRow( $config['cols']['LatLon'], $rowIdx )->getValue() ;
			if( ! empty($latlon))
			{
				$latlon2 = explode(',', $latlon);
				$latlon = array(
					1.0 * trim($latlon2[0]),
					1.0 * trim($latlon2[1])
				);
			}

			$siaeIdx = count($siae);
			$siaeNomIndex[ $nom ] = $siaeIdx ;
			$siae[ $siaeIdx ] = array(
				'id' => $siaeIdx + 1 ,
				'name' => $nom ,
				'address'=>$sheet->getCellByColumnAndRow( $config['cols']['adress'], $rowIdx )->getValue(),
				'latlon'=>$latlon,
				'phone'=>$sheet->getCellByColumnAndRow( $config['cols']['phone'], $rowIdx )->getValue(),
				'mail'=>$sheet->getCellByColumnAndRow( $config['cols']['mail'], $rowIdx )->getValue(),
				'type'=>$sheet->getCellByColumnAndRow( $config['cols']['type'], $rowIdx )->getValue(),
				'romes' => array()
			);
		}
		// fill array $siae 's romes
		if( ! in_array($rome, $siae[ $siaeNomIndex[ $nom ] ]['romes']) )
		{
			$siae[ $siaeNomIndex[ $nom ] ]['romes'][] = $rome ;
		}

		if( ! isset($rome2job[$rome]) )
		{
			$rome2job[$rome] = $sheet->getCellByColumnAndRow( $config['cols']['metier'], $rowIdx )->getValue();
		}

		// fill $siaeRomesIndex
		if( ! isset($siaeRomesIndex[$rome]))
			$siaeRomesIndex[$rome] = array();
		// fill $siaeNomIndex
		$siaeId = $siae[ $siaeNomIndex[ $nom ] ]['id'];
		if( ! in_array( $siaeId, $siaeRomesIndex[$rome] ) )
			$siaeRomesIndex[$rome][] = $siaeId ;

		addRome( $siaeRomesTree, $rome );

	}

	//echo "==========\n",var_export($siaeRomesTree,true),"\n";
	//echo 'count(siae): ', count($siae), "\n";

	// Write into file selected romes Tree as json 
	file_put_contents( $config['output_romes'], json_encode($siaeRomesTree) );
	// Write into file SIAE as json
	file_put_contents( $config['output_siae'], json_encode(array(
		'siaeByRome' => $siaeRomesIndex,
		'romeToJob' => $rome2job,
		'siae' => $siae
	)) );
}

/**
 * Search a Rome $codeRome and at its tree to used romes tree $siaeRomesTree.
 * 
 * @param array $siaeRomesTree
 * @param string $codeRome
 */
function addRome( array &$siaeRomesTree, $codeRome )
{
	global $romesJson ;

	//echo 'addRome ',$codeRome,"\n";

	$romeWithParents = getRomeData( $romesJson, $codeRome );
	if( empty($romeWithParents) )
	{
		// Error
		echo 'ERROR: "', $codeRome, '" not found in tree', "\n";
		die();
	}

	$romeWithParents = array_reverse($romeWithParents);
	//echo var_export($romeWithParents,true),"\n";

	fillRomeTree($siaeRomesTree, $romeWithParents);
	//echo "==========\n",var_export($siaeRomesTree,true),"\n";
}

/**
 * Fill an array with used romes
 * @param array $siaeRomesTree
 * @param array $romeWithParents
 */
function fillRomeTree( &$siaeRomesTree, $romeWithParents)
{
	if( empty($romeWithParents) )
		return ;
	for( $i=0; $i<count($siaeRomesTree); $i++ )
	{
		$rome = $siaeRomesTree[$i];
		if( $rome->id == $romeWithParents[0]->id )
		{
			if( isset($rome->children) )
			{
				array_shift($romeWithParents);
				fillRomeTree( $siaeRomesTree[$i]->children, $romeWithParents);
			}
			return ;
		}
	}

	// Not found => add it

	// TODO: Bug JsTree ?
	// if parent is set the tree won't load
	// but when I try with another dataset it's work ...
	unset( $romeWithParents[0]->parent );

	$siaeRomesTree[] = $romeWithParents[0];
	if( isset($siaeRomesTree[count($siaeRomesTree)-1]->children) )
	{
		array_shift($romeWithParents);
		fillRomeTree( $siaeRomesTree[ count($siaeRomesTree)-1 ]->children, $romeWithParents);
	}
}

/**
 * Recurse into $romesJson to find codeRome and return item and its parents
 * @param array $romesJson
 * @param string $codeRome
 */
function getRomeData( $romesJson, $codeRome, $depth=0 )
{
	for( $i=0; $i<count($romesJson); $i++ )
	{
		$rome = $romesJson[$i];
		if( isset($rome->rome) )
		{
			//echo str_pad('', $depth, "\t", STR_PAD_LEFT), $rome->rome, ' ', $rome->text, "\n";
			if( $rome->rome == $codeRome )
			{
				//echo str_pad('', $depth, "\t", STR_PAD_LEFT), 'FOUND', "\n";
				return array($rome) ;
			}
		}
		else
		{
			//echo str_pad('', $depth, "\t", STR_PAD_LEFT), $rome->text, "\n";
			$foundRome = getRomeData($rome->children, $codeRome, $depth+1 );
			if( ! empty($foundRome) )
			{
				$rome = clone $rome ;
				$rome->children = array();
				$foundRome[] = $rome  ;
				return $foundRome ;
			}
		}
	}
	return null ;
}
