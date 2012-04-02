<?php
chdir('..');
include 'common.inc';
include './benchmarks/data.inc.php';
$page_keywords = array('Benchmarks','Webpagetest','Website Speed Test','Page Speed');
$page_description = "WebPagetest benchmarks";
$aggregate = 'median';
if (array_key_exists('aggregate', $_REQUEST))
    $aggregate = $_REQUEST['aggregate'];
?>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
    <head>
        <title>WebPagetest - Benchmarks</title>
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
            
            <script type="text/javascript">
            function SelectedPoint(benchmark, metric, series, time, cached) {
                time = parseInt(time / 1000, 10);
                var isCached = 0;
                if (cached)
                    isCached = 1;
                window.location.href = "viewtest.php?benchmark=" + encodeURIComponent(benchmark) + "&metric=" + encodeURIComponent(metric) + "&cached=" + isCached + "&time=" + time;
            }
            </script>
            <div class="translucent">
            <div style="clear:both;">
                <div style="float:left;">
                    Click on a test heading to view all of the metrics for the given test.<br>
                    Click on a data point in the chart to see the scatter plot results for that specific test.<br>
                    Highlight an area of the chart to zoom in on that area and double-click to zoom out.
                </div>
                <div style="float: right;">
                    <form name="aggregation" method="get" action="index.php">
                        Aggregation <select name="aggregate" size="1" onchange="this.form.submit();">
                            <option value="avg" <?php if ($aggregate == 'avg') echo "selected"; ?>>Average</option>
                            <option value="geo-mean" <?php if ($aggregate == 'geo-mean') echo "selected"; ?>>Geometric Mean</option>
                            <option value="median" <?php if ($aggregate == 'median') echo "selected"; ?>>Median</option>
                            <option value="75pct" <?php if ($aggregate == '75pct') echo "selected"; ?>>75th Percentile</option>
                            <option value="95pct" <?php if ($aggregate == '95pct') echo "selected"; ?>>95th Percentile</option>
                        </select>
                    </form>
                </div>
            </div>
            <div style="clear:both;">
            </div>
            <?php
            $benchmarks = GetBenchmarks();
            $count = 0;
            foreach ($benchmarks as &$benchmark) {
                if (array_key_exists('title', $benchmark))
                    $title = $benchmark['title'];
                else
                    $title = $benchmark['name'];
                $bm = urlencode($benchmark['name']);
                echo "<h2><a href=\"view.php?benchmark=$bm&aggregate=$aggregate\">$title</a> <span class=\"small\">(<a name=\"{$benchmark['name']}\" href=\"#{$benchmark['name']}\">direct link</a>)</span></h2>\n";
                if (array_key_exists('description', $benchmark))
                    echo "<p>{$benchmark['description']}</p>\n";
                
                if ($benchmark['expand'] && count($benchmark['locations'] > 1)) {
                    foreach ($benchmark['locations'] as $location => $label) {
                        if (is_numeric($label))
                            $label = $location;
                        DisplayBenchmarkData($benchmark, $location, $label);
                    }
                } else {
                    DisplayBenchmarkData($benchmark);
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
* Display the charts for the given benchmark
* 
* @param mixed $benchmark
*/
function DisplayBenchmarkData(&$benchmark, $loc = null, $title = null) {
    global $count;
    global $aggregate;
    $label = 'Speed Index (First View)';
    $chart_title = '';
    if (isset($title))
        $chart_title = "title: \"$title (First View)\",";
    $tsv = LoadDataTSV($benchmark['name'], 0, 'SpeedIndex', $aggregate, $loc, $annotations);
    $metric = 'SpeedIndex';
    if (!isset($tsv) || !strlen($tsv)) {
        $label = 'Time to onload (First View)';
        $tsv = LoadDataTSV($benchmark['name'], 0, 'docTime', $aggregate, $loc, $annotations);
        $metric = 'docTime';
    }
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
                    $chart_title
                    labelsDiv: document.getElementById('{$id}_legend'),
                    pointClickCallback: function(e, p) {SelectedPoint(\"{$benchmark['name']}\", \"$metric\", p.name, p.xval, false);},
                    legend: \"always\",
                    xlabel: \"Date\",
                    ylabel: \"$label\"}
                );\n";
        if (isset($annotations) && count($annotations)) {
            echo "$id.setAnnotations(" . json_encode($annotations) . ");\n";
        }
        echo "</script>\n";
    }
    if (!array_key_exists('fvonly', $benchmark) || !$benchmark['fvonly']) {
        $label = 'Speed Index (Repeat View)';
        if (isset($title))
            $chart_title = "title: \"$title (Repeat View)\",";
        $tsv = LoadDataTSV($benchmark['name'], 1, 'SpeedIndex', $aggregate, $loc, $annotations);
        $metric = 'SpeedIndex';
        if (!isset($tsv) || !strlen($tsv)) {
            $label = 'Time to onload (Repeat View)';
            $tsv = LoadDataTSV($benchmark['name'], 1, 'docTime', $aggregate, $loc, $annotations);
            $metric = 'docTime';
        }
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
                        $chart_title
                        labelsDiv: document.getElementById('{$id}_legend'),
                        pointClickCallback: function(e, p) {SelectedPoint(\"{$benchmark['name']}\", \"$metric\", p.name, p.xval, true);},
                        legend: \"always\",
                        xlabel: \"Date\",
                        ylabel: \"$label\"}
                    );";
            if (isset($annotations) && count($annotations)) {
                echo "$id.setAnnotations(" . json_encode($annotations) . ");\n";
            }
            echo "</script>\n";
        }
    }
}
?>