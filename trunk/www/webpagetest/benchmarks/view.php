<?php
chdir('..');
include 'common.inc';
include './benchmarks/data.inc.php';
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmark details";
$aggregate = 'avg';
if (array_key_exists('aggregate', $_REQUEST))
    $aggregate = $_REQUEST['aggregate'];
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Benchmark details</title>
        <meta http-equiv="charset" content="iso-8859-1">
        <meta name="keywords" content="Performance, Optimization, Pagetest, Page Design, performance site web, internet performance, website performance, web applications testing, web application performance, Internet Tools, Web Development, Open Source, http viewer, debugger, http sniffer, ssl, monitor, http header, http header viewer">
        <meta name="description" content="Speed up the performance of your web pages with an automated analysis">
        <meta name="author" content="Patrick Meenan">
        <?php $gaTemplate = 'About'; include ('head.inc'); ?>
        <script type="text/javascript" src="/js/dygraph-combined.js"></script>
        <style type="text/css">
        .chart-container { clear: both; width: 875px; height: 350px; margin-left: auto; margin-right: auto; padding: 0;}
        .benchmark-chart { float: left; width: 700px; height: 350px; }
        .benchmark-legend { float: right; width: 150px; height: 350px; }
        </style>
    </head>
    <body>
        <div class="page">
            <?php
            $tab = 'Benchmarks';
            include 'header.inc';
            ?>
            
            <div class="translucent">
            <?php
            $metrics = array('SpeedIndex' => 'Speed Index',
                            'docTime' => 'Load Time (onload)', 
                            'TTFB' => 'Time to First Byte', 
                            'titleTime' => 'Time to Title', 
                            'render' => 'Time to Start Render', 
                            'fullyLoaded' => 'Load Time (Fully Loaded)', 
                            'domElements' => 'Number of DOM Elements', 
                            'connections' => 'Connections', 
                            'requests' => 'Requests (Fully Loaded)', 
                            'requestsDoc' => 'Requests (onload)', 
                            'bytesInDoc' => 'Bytes In (KB - onload)', 
                            'bytesIn' => 'Bytes In (KB - Fully Loaded)', 
                            'js_bytes' => 'Javascript Bytes (KB)', 
                            'js_requests' => 'Javascript Requests', 
                            'css_bytes' => 'CSS Bytes (KB)', 
                            'css_requests' => 'CSS Requests', 
                            'image_bytes' => 'Image Bytes (KB)', 
                            'image_requests' => 'Image Requests',
                            'flash_bytes' => 'Flash Bytes (KB)', 
                            'flash_requests' => 'Flash Requests', 
                            'html_bytes' => 'HTML Bytes (KB)', 
                            'html_requests' => 'HTML Requests', 
                            'text_bytes' => 'Text Bytes (KB)', 
                            'text_requests' => 'Text Requests',
                            'other_bytes' => 'Other Bytes (KB)', 
                            'other_requests' => 'Other Requests');
            if (array_key_exists('benchmark', $_REQUEST)) {
                $benchmark = $_REQUEST['benchmark'];
                $info = GetBenchmarkInfo($benchmark);
                if (!$info['video']) {
                    unset($metrics['SpeedIndex']);
                }
                echo "<h1>{$info['title']}</h1>";
                if (array_key_exists('description', $info))
                    echo "<p>{$info['description']}</p>\n";
                foreach( $metrics as $metric => $label) {
                    echo "<h2>$label</h2>\n";
                    if ($info['expand'] && count($info['locations'] > 1)) {
                        foreach ($info['locations'] as $location => $label) {
                            if (is_numeric($label))
                                $label = $location;
                            DisplayBenchmarkData($info, $metric, $location, $label);
                        }
                    } else {
                        DisplayBenchmarkData($info, $metric);
                    }
                }
            }
            ?>
            </div>
            
            <?php include('footer.inc'); ?>
        </div>
    </body>
</html>
<?php
/**
* Display the charts for the given benchmark/metric
* 
* @param mixed $benchmark
*/
function DisplayBenchmarkData(&$benchmark, $metric, $loc = null, $title = null) {
    global $count;
    global $aggregate;
    $chart_title = '';
    if (isset($title))
        $chart_title = "title: \"$title (First View)\",";
    $tsv = LoadDataTSV($benchmark['name'], 0, $metric, $aggregate, $loc);
    if (isset($tsv) && strlen($tsv)) {
        $count++;
        $id = "g$count";
        echo "<div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div>\n";
        echo "<script type=\"text/javascript\">
                $id = new Dygraph(
                    document.getElementById(\"$id\"),
                    \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                    {drawPoints: true,
                    rollPeriod: 1,
                    showRoller: true,
                    labelsSeparateLines: true,
                    labelsDiv: document.getElementById('{$id}_legend'),
                    $chart_title
                    legend: \"always\"}
                );
              </script>\n";
    }
    if (!array_key_exists('fvonly', $benchmark) || !$benchmark['fvonly']) {
        if (isset($title))
            $chart_title = "title: \"$title (Repeat View)\",";
        $tsv = LoadDataTSV($benchmark['name'], 1, $metric, $aggregate, $loc);
        if (isset($tsv) && strlen($tsv)) {
            $count++;
            $id = "g$count";
            echo "<br><div class=\"chart-container\"><div id=\"$id\" class=\"benchmark-chart\"></div><div id=\"{$id}_legend\" class=\"benchmark-legend\"></div></div>\n";
            echo "<script type=\"text/javascript\">
                    $id = new Dygraph(
                        document.getElementById(\"$id\"),
                        \"" . str_replace("\t", '\t', str_replace("\n", '\n', $tsv)) . "\",
                        {drawPoints: true,
                        rollPeriod: 1,
                        showRoller: true,
                        labelsSeparateLines: true,
                        labelsDiv: document.getElementById('{$id}_legend'),
                        $chart_title
                        legend: \"always\"}
                    );
                  </script>\n";
        }
    }
}    
?>
