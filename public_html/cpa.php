<?php
$lat = $_REQUEST['latitude'];
$lon = $_REQUEST['longitude'];

# $lat =  40.5260;
# $lon = -87.0360;

$host        = "23.21.221.151";
$port        = 5222;
$serviceName = "ip-10-245-185-87";

# 0 to -180 and 0 to 180
# US is -60 to -130

# approx 9660 miles from north to south pole
# each degree is 69.2 miles (each way - AT THE EQUATOR)

$region = "";

if( $lon <= -60 && $lon > -85 ) {
    $region = "east";
}
else if( $lon <= -85 && $lon > -110 ) {  
    $region = "central";
}
else if( $lon <= -110 && $lon > -130 ) {
    $region = "west";
}
else {
    $region = "other";
}

echo "{\"port\":\"".$port."\",\"host\":\"".$host."\",\"coordinatorJID\":\"coordinator@".$serviceName."\",\"preferredService\":\"".$region.".",$serviceName."\"}";
?>