#!/bin/bash

for f in ./*.tif
do
        echo "Processing $f..."
        gdal_translate -of GTiff -co tfw=yes -a_ullr -180 80.375 -120 40.125 -a_srs EPSG:4326 $f /tmp/geotmp.tif
        gdalwarp -t_srs '+proj=aea +lat_1=55 +lat_2=65 +lat_0=50 +lon_0=-154 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs' /tmp/geotmp.tif ./reproj/$f
done

# (Deprecated) As a hack to "pick the middle of the month as a weekly value," the line below can be used to rename any of the files
# whose date happens to be betewen the 11-19th of the month to serve as a "monthly average."  This won't be needed
# once we sort out the process by which the NetCDF gets turned into GeoTIFFs, etc.
# ls | grep -E seaice_conc_sic_mean_pct_weekly_ak_[0-9]{4}_[0-9]{2}_1[1-9] | sed 's/\(seaice_conc_sic_mean_pct_weekly_ak_\)\([0-9]\{4\}_[0-9]\{2\}\).*.tif/cp & \1\2_average.tif/' | sh