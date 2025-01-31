export const newMapArr = (mapPlot) => {
    const newArrMap = mapPlot?.map((data) => {
        const newArr = data?.map_geo_points?.map((lonLat) => {
            return {
                latitude: parseFloat(lonLat?.latitude),
                longitude: parseFloat(lonLat?.longitude)
            };
        });
        return {
            talhaoCenterGeo: data?.map_centro_id,
            talhao: data?.talhao__id_talhao,
            farmCenterGeo: data?.talhao__fazenda__map_centro_id,
            farmName: data?.talhao__fazenda__nome,
            coords: newArr
        };
    });

    return newArrMap

} 