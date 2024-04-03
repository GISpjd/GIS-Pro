
var map;
var layer_name, overlays; //对应wms_layers()和add_layer()
var view, popup, content; //重点是对应getInfo()部分
var selectedFeature, geojson; //对应与query()有关的部分
var measuretype


view = new ol.View({
    center: [120.2052342, 30.2489634],
    projection: 'EPSG:4326',
    zoom: 5
})

let base_maps = new ol.layer.Group({
    title: 'Base maps',
    layers: [
        new ol.layer.Tile({
            title: 'Satellite',
            type: 'base',
            visible: true,
            source: new ol.source.XYZ({
                attributions: ['Powered by Esri',
                    'Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
                ],
                attributionsCollapsible: false,
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                maxZoom: 23
            })
        }),
        new ol.layer.Tile({
            title: 'Mapbox',
            type: 'base',
            visible: true,
            source: new ol.source.XYZ({
                url: 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY3VkODUiLCJhIjoiY2xrYnFncXZhMGc1cTNlbmFrNHN1N2cxeCJ9.69E3f8nMJkvqQDRhLSojVw'
            })
        }),
        new ol.layer.Tile({
            title: 'GaoDe',
            type: 'base',
            visible: 'true',
            source: new ol.source.XYZ({
                url: 'http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}',
                wrapX: false
            })
        })
    ]
})

overlays = new ol.layer.Group({
    'title': 'Overlays',
    layers: []
})

popup = new Popup();

let mouse_position = new ol.control.MousePosition();

let slider = new ol.control.ZoomSlider();

let scale_line = new ol.control.ScaleLine({
    units: 'metric',
    bar: true,
    steps: 6,
    text: true,
    minWidth: 140,
    target: 'scale_bar'
});

map = new ol.Map({
    target: 'map',
    view
})

map.addLayer(base_maps)
map.addLayer(overlays)
map.addOverlay(popup)
map.addControl(mouse_position)
map.addControl(slider)
map.addControl(scale_line)
layerSwitcher = new ol.control.LayerSwitcher({
    activationMode: 'click',
    startActive: true,
    tipLabel: 'Layers', // Optional label for button
    groupSelectStyle: 'children', // Can be 'children' [default], 'group' or 'none'
    collapseTipLabel: 'Collapse layers',
});
map.addControl(layerSwitcher);
layerSwitcher.renderPanel();


function show_hide_querypanel() {
    // console.log(">>>");
    if (document.getElementById("query_tab").style.visibility == "hidden") {
        document.getElementById("query_panel_btn").innerHTML = "☰ Hide Query Panel";
        document.getElementById("query_panel_btn").setAttribute("class", "btn btn-danger btn-sm");
        document.getElementById("query_tab").style.visibility = "visible";
        document.getElementById("query_tab").style.width = "25%";
        document.getElementById("map").style.width = "75%";
        document.getElementById("map").style.left = "25%";
        document.getElementById('table_data').style.left = '25%';
        map.updateSize();
    } else {
        document.getElementById("query_panel_btn").innerHTML = "☰ Open Query Panel";
        document.getElementById("query_panel_btn").setAttribute("class", "btn btn-success btn-sm");
        document.getElementById("query_tab").style.width = "0%";
        document.getElementById("map").style.width = "100%";
        document.getElementById("map").style.left = "0%";
        document.getElementById("query_tab").style.visibility = "hidden";
        document.getElementById('table_data').style.left = '0%';
        map.updateSize();
    }
}

//填充query_tab中的layer下拉列表
$(function () {
    $.ajax({
        type: "GET",
        url: "http://localhost:8080/geoserver/wfs?service=wfs&version=1.1.0&request=getCapabilities",
        dataType: "xml",
        success: function (xml) {
            let layerSelect = $("#layer")
            $(xml).find('FeatureType').each(function () {
                let name = $(this).find('Name').text()
                layerSelect.append(`<option value='${name}'>${name}</option>`)
            })
        }
    })
})

$(function () {
    $.ajax({
        type: "GET",
        url: "http://localhost:8080/geoserver/wfs?service=wfs&version=1.1.0&request=getCapabilities",
        dataType: "xml",
        success: function (xml) {
            let layerSelect = $("#layer1")
            $(xml).find('FeatureType').each(function () {
                let name = $(this).find('Name').text()
                layerSelect.append(`<option value='${name}'>${name}</option>`)
            })
        }
    })
})

//根据选择的layer展示其属性字段名
$(function () {
    $('#layer').change(function () {
        let attributes = document.getElementById("attributes")
        attributes.innerHTML = ''

        let selectedLayer = $(this).val()
        console.log(selectedLayer);
        attributes.options[0] = new Option('Select attributes', "")

        $.ajax({
            type: "GET",
            url: `http://localhost:8080/geoserver/wfs?service=WFS&request=DescribeFeatureType&version=1.1.0&typeName=${selectedLayer}`,
            dataType: "xml",
            success: function (xml) {
                let attributeSelect = $('#attributes')
                $(xml).find('xsd\\:sequence').each(function () {
                    $(this).find('xsd\\:element').each(function () {
                        var value = $(this).attr('name');
                        var type = $(this).attr('type');
                        if (value != 'geom' && value != 'the_geom') {
                            attributeSelect.append(`<option value='${type}'>${value}</option>`)
                        }
                    })
                })
            }
        })
    })
})


//operator
$(function () {
    $('#attributes').change(function () {
        let operator = document.getElementById('operator')
        operator.innerHTML = ''

        let selectedAttribute = $(this).val()
        console.log(selectedAttribute);
        operator.options[0] = new Option('Select operator', "")

        if (selectedAttribute == 'xsd:short' || selectedAttribute == 'xsd:int' || selectedAttribute == 'xsd:double' || selectedAttribute == 'xsd:long') {
            operator.options[1] = new Option('Greater than', '>');
            operator.options[2] = new Option('Less than', '<');
            operator.options[3] = new Option('Equal to', '=');
            operator.options[4] = new Option('Between', 'BETWEEN');
        } else if (selectedAttribute == 'xsd:string') {
            operator.options[1] = new Option('Like', 'ILike');
        }

    })
})



var highlightStyle = new ol.style.Style({
    fill: new ol.style.Fill({
        color: 'rgba(255,0,0,0.3)',
    }),
    stroke: new ol.style.Stroke({
        color: '#3399CC',
        width: 3,
    }),
    image: new ol.style.Circle({
        radius: 10,
        fill: new ol.style.Fill({
            color: '#3399CC'
        })
    })
});
function query() {
    $('#table').empty();
    if (geojson) {
        map.removeLayer(geojson);
    }
    if (selectedFeature) {
        selectedFeature.setStyle();
        selectedFeature = undefined;
    }
    // if (vector1) {
    //     vector1.getSource().clear();
    // }

    var layer = document.getElementById("layer");
    var value_layer = layer.options[layer.selectedIndex].value;
    console.log(value_layer);
    //alert(value_layer);

    var attribute = document.getElementById("attributes");
    var value_attribute = attribute.options[attribute.selectedIndex].text;
    //alert(value_attribute);

    var operator = document.getElementById("operator");
    var value_operator = operator.options[operator.selectedIndex].value;
    //alert(value_operator);

    var txt = document.getElementById("value");

    var value_txt = value_operator == 'ILike' ? `${txt.value}%25` : txt.value



    var url = "http://localhost:8080/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + value_layer + "&CQL_FILTER=" + value_attribute + "%20" + value_operator + "%20" + value_txt + "&outputFormat=application/json"
    //console.log(url);

    style = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#FF0000',
            width: 3
        }),

        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#FF0000'
            })
        })
    });
    geojson = new ol.layer.Vector({
        //title:'dfdfd',
        //title: '<h5>' + value_crop+' '+ value_param +' '+ value_seas+' '+value_level+'</h5>',
        source: new ol.source.Vector({
            url: url,
            format: new ol.format.GeoJSON()
        }),
        style: style,
    });

    geojson.getSource().on('addfeature', function () {
        //alert(geojson.getSource().getExtent());
        map.getView().fit(
            geojson.getSource().getExtent(), {
            duration: 1590,
            size: map.getSize()
        }
        );
    });

    //overlays.getLayers().push(geojson);
    map.addLayer(geojson);

    $.getJSON(url, function (data) {
        var col = [];
        col.push('id');
        for (var i = 0; i < data.features.length; i++) {

            for (var key in data.features[i].properties) {

                if (col.indexOf(key) === -1) {
                    col.push(key);
                }
            }
        }

        var table = document.createElement("table");
        table.setAttribute("class", "table table-hover table-striped");
        table.setAttribute("id", "table");

        var caption = document.createElement("caption");
        caption.setAttribute("id", "caption");
        caption.style.captionSide = 'top';
        caption.innerHTML = value_layer + " (Number of Features : " + data.features.length + " )";
        table.appendChild(caption);

        // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.

        var tr = table.insertRow(-1); // TABLE ROW.

        for (var i = 0; i < col.length; i++) {
            var th = document.createElement("th"); // TABLE HEADER.
            th.innerHTML = col[i];
            tr.appendChild(th);
        }

        // ADD JSON DATA TO THE TABLE AS ROWS.
        for (var i = 0; i < data.features.length; i++) {

            tr = table.insertRow(-1);

            for (var j = 0; j < col.length; j++) {
                var tabCell = tr.insertCell(-1);
                if (j == 0) {
                    tabCell.innerHTML = data.features[i]['id'];
                } else {
                    //alert(data.features[i]['id']);
                    tabCell.innerHTML = data.features[i].properties[col[j]];
                    //alert(tabCell.innerHTML);
                }
            }
        }


        // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON DATA TO A CONTAINER.
        var divContainer = document.getElementById("table_data");
        divContainer.innerHTML = "";
        divContainer.appendChild(table);



        document.getElementById('map').style.height = '71%';
        document.getElementById('table_data').style.height = '29%';
        map.updateSize();
        addRowHandlers();

    });
    map.on('singleclick', highlight);
}

function highlight(evt) {

    if (selectedFeature) {
        selectedFeature.setStyle();
        selectedFeature = undefined;
    }

    var feature = map.forEachFeatureAtPixel(evt.pixel,
        function (feature, layer) {
            return feature;
        });

    if (feature && feature.getId() != undefined) {


        var geometry = feature.getGeometry();
        var coord = geometry.getCoordinates();
        var coordinate = evt.coordinate;
        //alert(feature.get('gid'));
        // alert(coordinate);
        /*var content1 = '<h3>' + feature.get([name]) + '</h3>';
        content1 += '<h5>' + feature.get('crop')+' '+ value_param +' '+ value_seas+' '+value_level+'</h5>'
        content1 += '<h5>' + feature.get([value_param]) +' '+ unit +'</h5>';
    	
       // alert(content1);
        content.innerHTML = content1;
        overlay.setPosition(coordinate);*/

        // console.info(feature.getProperties());

        $(function () {
            $("#table td").each(function () {
                $(this).parent("tr").css("background-color", "white");
            });
        });
        feature.setStyle(highlightStyle);
        selectedFeature = feature;
        var table = document.getElementById('table');
        var cells = table.getElementsByTagName('td');
        var rows = document.getElementById("table").rows;
        var heads = table.getElementsByTagName('th');
        var col_no;
        for (var i = 0; i < heads.length; i++) {
            // Take each cell
            var head = heads[i];
            //alert(head.innerHTML);
            if (head.innerHTML == 'id') {
                col_no = i + 1;
                //alert(col_no);
            }

        }
        var row_no = findRowNumber(col_no, feature.getId());
        //alert(row_no);

        var rows = document.querySelectorAll('#table tr');

        rows[row_no].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        $(document).ready(function () {
            $("#table td:nth-child(" + col_no + ")").each(function () {

                if ($(this).text() == feature.getId()) {
                    $(this).parent("tr").css("background-color", "grey");
                }


            });
        });
    } else {
        $(function () {
            $("#table td").each(function () {
                $(this).parent("tr").css("background-color", "white");
            });
        });

    }

};

function findRowNumber(cn1, v1) {
    var table = document.querySelector('#table');
    var rows = table.querySelectorAll("tr");
    var msg = "No such row exist"
    for (i = 1; i < rows.length; i++) {
        var tableData = rows[i].querySelectorAll("td");
        if (tableData[cn1 - 1].textContent == v1) {
            msg = i;
            break;
        }
    }
    return msg;
}

function addRowHandlers() {
    var rows = document.getElementById("table").rows;
    var heads = table.getElementsByTagName('th');
    var col_no;
    for (var i = 0; i < heads.length; i++) {
        // Take each cell
        var head = heads[i];
        //alert(head.innerHTML);
        if (head.innerHTML == 'id') {
            col_no = i + 1;
            //alert(col_no);
        }

    }
    for (i = 0; i < rows.length; i++) {

        rows[i].onclick = function () {
            return function () {
                if (selectedFeature) {
                    selectedFeature.setStyle();
                    selectedFeature = undefined;
                }
                $(function () {
                    $("#table td").each(function () {
                        $(this).parent("tr").css("background-color", "white");
                    });
                });
                var cell = this.cells[col_no - 1];
                var id = cell.innerHTML;


                $(document).ready(function () {
                    $("#table td:nth-child(" + col_no + ")").each(function () {
                        if ($(this).text() == id) {
                            $(this).parent("tr").css("background-color", "grey");
                        }
                    });
                });

                var features = geojson.getSource().getFeatures();

                for (i = 0; i < features.length; i++) {
                    if (features[i].getId() == id) {
                        //alert(features[i].feature.id);
                        features[i].setStyle(highlightStyle);
                        selectedFeature = features[i];
                        var featureExtent = features[i].getGeometry().getExtent();
                        if (featureExtent) {
                            map.getView().fit(featureExtent, {
                                duration: 1590,
                                size: map.getSize()
                            });
                        }

                    }
                }

                //alert("id:" + id);
            };
        }(rows[i]);
    }
}

var draw_type = document.querySelector('#draw_type')
// console.log(draw_type);
var draw1
var source1 = new ol.source.Vector({
    wrapX: false
})
var vector1 = new ol.layer.Vector({
    source: source1
})
map.addLayer(vector1)


draw_type.onchange = function () {
    map.removeInteraction(draw1)
    if (draw) {
        map.removeInteraction(draw)
        map.removeOverlay(helpTooltip)
        map.removeOverlay(measureTooltip)
    }
    if (vectorLayer) {
        vectorLayer.getSource().clear()
    }
    if (measureTooltipElement) {
        var elem = document.getElementsByClassName("tooltip tooltip-static")
        for (let i = elem.length - 1; i >= 0; i--) {
            elem[i].remove()
        }
    }
    add_draw_Interaction()
}

function add_draw_Interaction() {
    let value = draw_type.value
    if (value !== 'None') {
        let geometryFunction
        if (value === 'Square') {
            value = 'Circle';
            geometryFunction = new ol.interaction.Draw.createRegularPolygon(4)
        } else if (value === 'Box') {
            value = 'Circle';
            geometryFunction = new ol.interaction.Draw.createBox()
        } else if (value === 'Star') {
            value = 'Circle';
            geometryFunction = function (coordinates, geometry) {
                let start = coordinates[0]
                let end = coordinates[1]
                let dx = start[0] - end[0]
                let dy = start[1] - end[1]

                let radius = Math.sqrt(dx * dx + dy * dy)
                // 得到这两点形成的向量相对于水平轴（x轴）正向的角度，第一个参数是垂直分量，第二个是水平分量
                let initialAngel = Math.atan2(dy, dx)

                //存储组成星环的点
                let newCoordinates = []

                let pointsNum = 12
                for (let i = 0; i < pointsNum; i++) {
                    let newAngel = initialAngel + i * 2 * Math.PI / pointsNum
                    let ratio = i % 2 === 0 ? 1 : 0.5
                    // 极坐标转到直角坐标系下x=r*cos(?),y=r*sin(?)
                    let offsetX = radius * ratio * Math.cos(newAngel)
                    let offsetY = radius * ratio * Math.sin(newAngel)
                    newCoordinates.push([start[0] + offsetX, start[1] + offsetY])
                }
                // 让星环闭合
                newCoordinates.push(newCoordinates[0].slice())

                if (!geometry) {
                    geometry = new ol.geom.Polygon([newCoordinates])
                } else {
                    geometry.setCoordinates([newCoordinates])
                }
                return geometry
            };
        }
        if (draw_type.value == 'select' || draw_type.value == 'clear') {

            if (draw1) { map.removeInteraction(draw1); }
            vector1.getSource().clear();
            if (geojson) {
                geojson.getSource().clear();
                map.removeLayer(geojson);
            }

        } else if (draw_type.value == 'Square' || draw_type.value == 'Polygon' || draw_type.value == 'Circle' || draw_type.value == 'Star' || draw_type.value == 'Box') {
            draw1 = new ol.interaction.Draw({
                source: source1,
                type: value,
                //几何体坐标更新时调用geometryFunction函数
                geometryFunction: geometryFunction
            });

            map.addInteraction(draw1);

            draw1.on('drawstart', function (evt) {
                if (vector1) {
                    vector1.getSource().clear();
                }
                if (geojson) {
                    geojson.getSource().clear();
                    map.removeLayer(geojson);
                }

            });

            draw1.on('drawend', function (evt) {
                var feature = evt.feature;
                // console.log(feature);

                var coords = feature.getGeometry();
                // console.log(coords);
                var format = new ol.format.WKT();
                var wkt = format.writeGeometry(coords);
                var encodedWKT = encodeURIComponent(wkt);
                console.log(encodedWKT);

                var layer_name = document.getElementById("layer1");
                var value_layer = layer_name.options[layer_name.selectedIndex].value;

                var url = `http://localhost:8080/geoserver/wfs?request=GetFeature&version=1.0.0&typeName=${value_layer}&outputFormat=json&cql_filter=INTERSECTS(the_geom,${encodedWKT})`;


                console.log(url);


                style = new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.2)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#ffcc33',
                        width: 3
                    }),

                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({
                            color: '#ffcc33'
                        })
                    })
                });

                geojson = new ol.layer.Vector({
                    //title:'dfdfd',
                    //title: '<h5>' + value_crop+' '+ value_param +' '+ value_seas+' '+value_level+'</h5>',
                    source: new ol.source.Vector({
                        url: url,
                        format: new ol.format.GeoJSON()
                    }),
                    style: style,

                });

                geojson.getSource().on('addfeature', function () {
                    //alert(geojson.getSource().getExtent());
                    map.getView().fit(
                        geojson.getSource().getExtent(), {
                        duration: 1590,
                        size: map.getSize()
                    }
                    );
                });

                //overlays.getLayers().push(geojson);
                map.addLayer(geojson);
                map.removeInteraction(draw1);
                $.getJSON(url, function (data) {
                    var col = [];
                    col.push('id');
                    for (var i = 0; i < data.features.length; i++) {

                        for (var key in data.features[i].properties) {

                            if (col.indexOf(key) === -1) {
                                col.push(key);
                            }
                        }
                    }



                    var table = document.createElement("table");
                    table.setAttribute("class", "table table-hover table-striped");
                    table.setAttribute("id", "table");

                    var caption = document.createElement("caption");
                    caption.setAttribute("id", "caption");
                    caption.style.captionSide = 'top';
                    caption.innerHTML = value_layer + " (Number of Features : " + data.features.length + " )";
                    table.appendChild(caption);



                    // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.

                    var tr = table.insertRow(-1); // TABLE ROW.

                    for (var i = 0; i < col.length; i++) {
                        var th = document.createElement("th"); // TABLE HEADER.
                        th.innerHTML = col[i];
                        tr.appendChild(th);
                    }

                    // ADD JSON DATA TO THE TABLE AS ROWS.
                    for (var i = 0; i < data.features.length; i++) {

                        tr = table.insertRow(-1);

                        for (var j = 0; j < col.length; j++) {
                            var tabCell = tr.insertCell(-1);
                            if (j == 0) {
                                tabCell.innerHTML = data.features[i]['id'];
                            } else {
                                //alert(data.features[i]['id']);
                                tabCell.innerHTML = data.features[i].properties[col[j]];
                                //alert(tabCell.innerHTML);
                            }
                        }
                    }


                    // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON DATA TO A CONTAINER.
                    var divContainer = document.getElementById("table_data");
                    divContainer.innerHTML = "";
                    divContainer.appendChild(table);



                    document.getElementById('map').style.height = '71%';
                    document.getElementById('table_data').style.height = '29%';
                    map.updateSize();
                    addRowHandlers();

                });
                map.on('singleclick', highlight);

            });


        }

    }
}



function wms_layers() {
    $(function () {
        $("#wms_layers_window").modal({
            // 当模态框打开时，背景无遮罩层
            backdrop: false
        });
        //模态框可拖动
        $("#wms_layers_window").draggable();
        //展示模态框
        $("#wms_layers_window").modal('show');
    });

    $(document).ready(function () {
        $.ajax({
            type: "GET",
            url: "http://localhost:8080/geoserver/wms?request=getCapabilities",
            dataType: "xml",
            success: function (xml) {
                console.log("????");
                $tableWmsLayer = $("#table_wms_layers")
                $tableWmsLayer.empty()
                let headerHtml = `<tr><th>Name</th><th>CRS</th><th>Title</th><th>Abstract</th></tr>`
                $tableWmsLayer.append(headerHtml)
                $(xml).find('Layer').find('Layer').each(function () {
                    let name = $(this).children('Name').text()
                    let title = $(this).children('Title').text()
                    let crs = $(this).children('CRS').first().text()
                    let abstract = $(this).children('Abstract').text()
                    let rowHtml = `<tr><td>${name}</td><td>${crs}</td><td>${title}</td><td>${abstract}</td><tr>`
                    $tableWmsLayer.append(rowHtml)
                })
                addSelectedColor()
            }

        })
    })
    function addSelectedColor() {
        // 获取表格和行
        var $table = $("#table_wms_layers");
        var $rows = $table.find("tr");

        // 为每一行添加点击事件监听器
        $rows.on("click", function () {
            // 首先重置所有行的背景色
            $rows.find("td").css("background-color", "white");
            // 然后将点击的行中对应列的背景色设置为灰色
            $(this).find("td").css("background-color", "grey");
            layer_name = $(this).find("td:first").text();
            console.log(layer_name);
        });
    }
}


// function wms_layers() {
//     // 显示模态窗口
//     const wmsLayersWindow = document.getElementById('wms_layers_window');
//     wmsLayersWindow.style.display = 'block'; // 假设你已有方法显示和处理模态窗口

//     // 发送请求获取数据
//     axios.get('http://localhost:8080/geoserver/wms?request=getCapabilities')
//         .then(function (response) {
//             const parser = new DOMParser();
//             const xml = parser.parseFromString(response.data, "text/xml");
//             const table = document.getElementById('table_wms_layers');
//             table.innerHTML = ''; // 清空表格

//             // 添加表头
//             const headerRow = document.createElement('tr');
//             headerRow.innerHTML = '<th>Name</th><th>Title</th><th>Abstract</th>';
//             table.appendChild(headerRow);

//             // 填充数据
//             const layers = xml.querySelectorAll('Layer > Layer');
//             layers.forEach(layer => {
//                 const name = layer.querySelector('Name').textContent;
//                 const title = layer.querySelector('Title').textContent;
//                 const abst = layer.querySelector('Abstract').textContent;

//                 const row = document.createElement('tr');
//                 row.innerHTML = `<td>${name}</td><td>${title}</td><td>${abst}</td>`;
//                 table.appendChild(row);
//             });

//             addRowHandlers1();
//         })
//         .catch(function (error) {
//             console.log(error);
//         });

//     // 行点击事件处理
//     function addRowHandlers1() {
//         const table = document.getElementById('table_wms_layers');
//         table.addEventListener('click', function (e) {
//             const target = e.target;
//             if (target.tagName === 'TD') {
//                 const rows = table.getElementsByTagName('tr');
//                 Array.from(rows).forEach(row => row.style.backgroundColor = 'white'); // 重置背景色
//                 const selectedRow = target.parentNode;
//                 selectedRow.style.backgroundColor = 'grey'; // 设置选中行背景色
//             }
//         });
//     }
// }


function close_wms_window() {
    layer_name = null
}

function add_layer() {
    var layer_wms = new ol.layer.Image({
        title: layer_name,
        // extent: [-180, -90, -180, 90],
        source: new ol.source.ImageWMS({
            url: 'http://localhost:8080/geoserver/wms',
            params: {
                'LAYERS': layer_name
            },
            ratio: 1,
            serverType: 'geoserver'
        })
    });
    overlays.getLayers().push(layer_wms);

    var url = 'http://localhost:8080/geoserver/wms?request=getCapabilities';
    var parser = new ol.format.WMSCapabilities();


    $.ajax(url).then(function (response) {
        //window.alert("word");
        var result = parser.read(response);
        // console.log(result);
        // window.alert(result);
        var Layers = result.Capability.Layer.Layer;
        var extent;
        for (var i = 0, len = Layers.length; i < len; i++) {

            var layerobj = Layers[i];
            //  window.alert(layerobj.Name);

            if (layerobj.Name == layer_name) {
                extent = layerobj.BoundingBox[0].extent;
                //alert(extent);
                map.getView().fit(
                    extent, {
                    duration: 1590,
                    size: map.getSize()
                }
                );
            }
        }
    });

    layerSwitcher.renderPanel();
    legend();

}




function clear_all() {
    if (vector1) {
        vector1.getSource().clear();
        //map.removeLayer(geojson);
    }

    if (draw1) {
        map.removeInteraction(draw1);
    }
    document.getElementById('map').style.height = '100%';
    document.getElementById('table_data').style.height = '0%';
    map.updateSize();
    $('#table').empty();
    $('#legend').empty();
    if (geojson) {
        geojson.getSource().clear();
        map.removeLayer(geojson);
    }

    if (selectedFeature) {
        selectedFeature.setStyle();
        selectedFeature = undefined;
    }
    if (popup) {
        popup.hide();
    }
    map.getView().fit([65.90, 7.48, 98.96, 40.30], {
        duration: 1590,
        size: map.getSize()
    });

    document.getElementById("query_panel_btn").innerHTML = "☰ Open Query Panel";
    document.getElementById("query_panel_btn").setAttribute("class", "btn btn-success btn-sm");

    document.getElementById("query_tab").style.width = "0%";
    document.getElementById("map").style.width = "100%";
    document.getElementById("map").style.left = "0%";
    document.getElementById("query_tab").style.visibility = "hidden";
    document.getElementById('table_data').style.left = '0%';

    document.getElementById("legend_btn").innerHTML = "☰ Show Legend";
    document.getElementById("legend").style.width = "0%";
    document.getElementById("legend").style.visibility = "hidden";
    document.getElementById('legend').style.height = '0%';

    map.un('singleclick', getInfo);
    map.un('singleclick', highlight);
    document.getElementById("info_btn").innerHTML = "☰ Activate GetInfo";
    document.getElementById("info_btn").setAttribute("class", "btn btn-success btn-sm");
    map.updateSize();



    overlays.getLayers().getArray().slice().forEach(layer => {
        overlays.getLayers().remove(layer);
        console.log('成功了');
    });

    layerSwitcher.renderPanel();

    if (draw) {
        map.removeInteraction(draw)
    };
    if (vectorLayer) {
        vectorLayer.getSource().clear();
    }
    map.removeOverlay(helpTooltip);
    map.removeOverlay(measureTooltip)

    if (measureTooltipElement) {
        var elem = document.getElementsByClassName("tooltip tooltip-static");

        //alert(elem.length);
        for (var i = elem.length - 1; i >= 0; i--) {

            elem[i].remove();
            //alert(elem[i].innerHTML);
        }
    }
}

function info() {
    let info_btn = document.getElementById("info_btn")
    if (info_btn.innerHTML == "☰ Activate GetInfo") {
        info_btn.innerHTML = "☰ De-Activate GetInfo"
        info_btn.setAttribute('class', 'btn btn-danger btn-sm')
        map.on('singleclick', getInfo)
    } else {
        map.un('singleclick', getInfo);
        info_btn.innerHTML = "☰ Activate GetInfo"
        info_btn.setAttribute('class', 'btn btn-success btn-sm')
        if (popup) {
            popup.hide();
        }
    }
}

function getInfo(e) {
    // console.log(e.coordinate);
    let coordinate = e.coordinate
    let viewResolution = /** @type {number} */ (view.getResolution())
    if (popup) {
        popup.hide();
    }
    if (content) {
        content = '';
    }
    overlays.getLayers().getArray().slice().forEach(layer => {
        let visibility = layer.getVisible()
        if (visibility == true) {
            let layer_title = layer.get('title')
            let wmsSource = new ol.source.ImageWMS({
                url: 'http://localhost:8080/geoserver/wms',
                params: {
                    'LAYERS': layer_title
                },
                serverType: 'geoserver',
                crossOrigin: 'anonymous'
            });
            let url = wmsSource.getFeatureInfoUrl(
                coordinate, viewResolution, 'EPSG:4326', {
                'INFO_FORMAT': 'text/html'
            });

            $.get(url, data => {
                content += data
                popup.show(coordinate, content)
            })
        }
    })
}


//选择展示或隐藏legend框
function show_hide_legend() {
    let legend_btn = document.getElementById("legend_btn")
    let legend = document.getElementById("legend")
    if (document.getElementById("legend").style.visibility == "hidden") {
        legend_btn.innerHTML = "☰ Hide Legend"
        legend_btn.setAttribute("class", "btn btn-danger btn-sm")

        legend.style.visibility = "visible"
        legend.style.width = "15%"
        legend.style.height = "40%"
        map.updateSize()
    } else {
        legend_btn.innerHTML = "☰ Show Legend"
        legend_btn.setAttribute("class", "btn btn-success btn-sm")
        legend.style.visibility = "hidden"
        legend.style.width = "0%"
        legend.style.height = "0%"
    }
}

//布置图例
function legend() {
    $('#legend').empty()
    let legendContainer = document.getElementById("legend")
    let head = document.createElement('h5')
    head.textContent = "Legend"
    head.setAttribute('style', 'border-bottom: 1px solid red;border-bottom: 1px solid red;')
    legendContainer.appendChild(head)

    overlays.getLayers().getArray().slice().forEach(layer => {
        let body = document.createElement("p")
        let layerName = layer.get('title')
        body.textContent = layerName
        legendContainer.appendChild(body)
        let img = new Image()
        img.src = `http://localhost:8080/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&LAYER=${layerName}`
        legendContainer.appendChild(img)
    })
}

//初始化头部
legend()


measuretype = document.getElementById('measuretype')
measuretype.onchange = function () {
    let info_btn = document.getElementById("info_btn")
    map.un('singleclick', getInfo)
    info_btn.innerHTML = "☰ Activate GetInfo"
    info_btn.setAttribute('class', 'btn btn-success btn-sm')
    if (popup) {
        popup.hide();
    }
    map.removeInteraction(draw);
    addInteraction();
}

//设置draw结束之后线面的样式
var source = new ol.source.Vector()
var vectorLayer = new ol.layer.Vector({
    source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33'
            })
        })
    })
})

map.addLayer(vectorLayer)

var sketch, helpTooltipElement, helpTooltip, measureTooltipElement, measureTooltip;
var continuePolygonMsg = 'Click to continue drawing the polygon';
var continueLineMsg = 'Click to continue drawing the line';
var draw;

var output

//测量长度
var formatLength = function (line) {
    let length = ol.sphere.getLength(line, {
        projection: 'EPSG:4326'
    })

    if (length > 1000) {
        output = `${Math.round(length / 1000)}km`
    } else {
        output = `${Math.round(length * 1000) / 1000}m`
    }

    return output

}


// 测量面积
var formatArea = function (polygon) {
    let area = ol.sphere.getArea(polygon, {
        projection: 'EPSG:4326'
    })

    if (area > 10000) {
        output = `${(area / 1000000).toFixed(2)}km<sup>2</sup>`
    } else {
        output = `${area.toFixed(2)}m<sup>2</sup>`
    }

    return output
}



function addInteraction() {
    if (measuretype.value == 'select' || measuretype.value == 'clear') {
        if (draw) {
            map.removeInteraction(draw)
        }
        if (vectorLayer) {
            vectorLayer.getSource().clear()
        }
        if (helpTooltip) {
            map.removeOverlay(helpTooltip)
        }

        //清除所有测量结果的标记
        if (measureTooltipElement) {
            var elem = document.getElementsByClassName("tooltip tooltip-static");
            for (var i = elem.length - 1; i >= 0; i--) {

                elem[i].remove();
            }
        }
    } else if (measuretype.value == 'length' || measuretype.value == 'area') {
        let type
        type = measuretype.value == 'area' ? 'Polygon' : 'LineString'
        draw = new ol.interaction.Draw({
            source: source,
            type,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.5)'
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 0, 0, 0.5)',
                    lineDash: [10, 10],
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 5,
                    stroke: new ol.style.Stroke({
                        color: 'rgba(0, 0, 0, 0.7)'
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.5)'
                    })
                })
            })
        })
        map.addInteraction(draw)
        createMeasureTooltip()
        createHelpTooltip()


        let pointerMoveHandler = function (e) {
            if (e.dragging) {
                return;
            }
            let helpMsg = 'Click to start drawing'

            if (sketch) {
                let geom = (sketch.getGeometry())
                if (geom instanceof ol.geom.Polygon) {
                    helpMsg = continuePolygonMsg
                } else if (geom instanceof ol.geom.LineString) {
                    helpMsg = continueLineMsg
                }
            }

            helpTooltipElement.innerHTML = helpMsg
            helpTooltip.setPosition(e.coordinate)
            helpTooltipElement.classList.remove('hidden')
        }

        map.on('pointermove', pointerMoveHandler)
        map.getViewport().addEventListener('mouseout', function () {
            helpTooltipElement.classList.add('hidden');
        });

        var listener;
        draw.on('drawstart',
            function (evt) {
                // set sketch
                sketch = evt.feature;

                /** @type {module:ol/coordinate~Coordinate|undefined} */
                var tooltipCoord = evt.coordinate;

                listener = sketch.getGeometry().on('change', function (evt) {
                    var geom = evt.target;
                    if (geom instanceof ol.geom.Polygon) {

                        output = formatArea(geom);
                        tooltipCoord = geom.getInteriorPoint().getCoordinates();

                    } else if (geom instanceof ol.geom.LineString) {

                        output = formatLength(geom);
                        tooltipCoord = geom.getLastCoordinate();
                    }
                    measureTooltipElement.innerHTML = output;
                    measureTooltip.setPosition(tooltipCoord);
                });
            }, this);

        draw.on('drawend',
            function () {
                measureTooltipElement.className = 'tooltip tooltip-static';
                measureTooltip.setOffset([0, -7]);
                // unset sketch
                sketch = null;
                // unset tooltip so that a new one can be created
                measureTooltipElement = null;
                createMeasureTooltip();
                ol.Observable.unByKey(listener);
            }, this);

    }

}


function createHelpTooltip() {
    if (helpTooltipElement) {
        //删除helpTooltipElement节点
        helpTooltipElement.parentNode.removeChild(helpTooltipElement)
    }
    helpTooltipElement = document.createElement('div')
    helpTooltipElement.className = 'tooltip hidden'
    helpTooltip = new ol.Overlay({
        element: helpTooltipElement,
        offset: [15, 0],
        positioning: 'center-left'
    })
    map.addOverlay(helpTooltip)
}

function createMeasureTooltip() {
    if (measureTooltipElement) {
        measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement('div');
    measureTooltipElement.className = 'tooltip tooltip-measure';

    measureTooltip = new ol.Overlay({
        element: measureTooltipElement,
        offset: [0, -15],
        positioning: 'bottom-center'
    });
    map.addOverlay(measureTooltip);
}

