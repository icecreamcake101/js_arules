

///////////////////////////////
// taken as is from https://github.com/tcorral/JSONC

/*global gzip, Base64*/
(function() {

        var root, JSONC = {},
            isNodeEnvironment, _nCode = -1,
            toString = {}.toString;

        /**
         * set the correct root depending from the environment.
         * @type {Object}
         * @private
         */
        root = this;
        /**
         * Check if JSONC is loaded in Node.js environment
         * @type {Boolean}
         * @private
         */
        isNodeEnvironment = typeof exports === 'object' && typeof module === 'object' && typeof module.exports === 'object' && typeof require === 'function';
        /**
         * Checks if the value exist in the array.
         * @param arr
         * @param v
         * @returns {boolean}
         */
        function contains(arr, v) {
            var nIndex, nLen = arr.length;
            for (nIndex = 0; nIndex < nLen; nIndex++) {
                if (arr[nIndex][1] === v) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Removes duplicated values in an array
         * @param oldArray
         * @returns {Array}
         */
        function unique(oldArray) {
            var nIndex, nLen = oldArray.length,
                aArr = [];
            for (nIndex = 0; nIndex < nLen; nIndex++) {
                if (!contains(aArr, oldArray[nIndex][1])) {
                    aArr.push(oldArray[nIndex]);
                }
            }
            return aArr;
        }

        /**
         * Escapes a RegExp
         * @param text
         * @returns {*}
         */
        function escapeRegExp(text) {
            return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        }

        /**
         * Returns if the obj is an object or not.
         * @param obj
         * @returns {boolean}
         * @private
         */
        function _isObject(obj) {
            return toString.call(obj) === '[object Object]';
        }

        /**
         * Returns if the obj is an array or not
         * @param obj
         * @returns {boolean}
         * @private
         */
        function _isArray(obj) {
            return toString.call(obj) === '[object Array]';
        }

        /**
         * Converts a bidimensional array to object
         * @param aArr
         * @returns {{}}
         * @private
         */
        function _biDimensionalArrayToObject(aArr) {
            var obj = {},
                nIndex, nLen = aArr.length,
                oItem;
            for (nIndex = 0; nIndex < nLen; nIndex++) {
                oItem = aArr[nIndex];
                obj[oItem[0]] = oItem[1];
            }
            return obj;
        }

        /**
         * Convert a number to their ascii code/s.
         * @param index
         * @param totalChar
         * @param offset
         * @returns {Array}
         * @private
         */
        function _numberToKey(index, totalChar, offset) {
            var sKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=_!?()*',
                aArr = [],
                currentChar = index;
            totalChar = totalChar || sKeys.length;
            offset = offset || 0;
            while (currentChar >= totalChar) {
                aArr.push(sKeys.charCodeAt((currentChar % totalChar) + offset));
                currentChar = Math.floor(currentChar / totalChar - 1);
            }
            aArr.push(sKeys.charCodeAt(currentChar + offset));
            return aArr.reverse();
        }

        /**
         * Returns the string using an array of ASCII values
         * @param aKeys
         * @returns {string}
         * @private
         */
        function _getSpecialKey(aKeys) {
            return String.fromCharCode.apply(String, aKeys);
        }

        /**
         * Traverse all the objects looking for keys and set an array with the new keys
         * @param json
         * @param aKeys
         * @returns {*}
         * @private
         */
        function _getKeys(json, aKeys) {
            var aKey, sKey, oItem;

            for (sKey in json) {

                if (json.hasOwnProperty(sKey)) {
                    oItem = json[sKey];
                    if (_isObject(oItem) || _isArray(oItem)) {
                        aKeys = aKeys.concat(unique(_getKeys(oItem, aKeys)));
                    }
                    if (isNaN(Number(sKey))) {
                        if (!contains(aKeys, sKey)) {
                            _nCode += 1;
                            aKey = [];
                            aKey.push(_getSpecialKey(_numberToKey(_nCode)), sKey);
                            aKeys.push(aKey);
                        }
                    }
                }
            }
            return aKeys;
        }

        /**
         * Method to compress array objects
         * @private
         * @param json
         * @param aKeys
         */
        function _compressArray(json, aKeys) {
            var nIndex, nLenKeys;

            for (nIndex = 0,
                nLenKeys = json.length; nIndex < nLenKeys; nIndex++) {
                json[nIndex] = JSONC.compress(json[nIndex], aKeys);
            }
        }

        /**
         * Method to compress anything but array
         * @private
         * @param json
         * @param aKeys
         * @returns {*}
         */
        function _compressOther(json, aKeys) {
            var oKeys, aKey, str, nLenKeys, nIndex, obj;
            aKeys = _getKeys(json, aKeys);
            aKeys = unique(aKeys);
            oKeys = _biDimensionalArrayToObject(aKeys);

            str = JSON.stringify(json);
            nLenKeys = aKeys.length;

            for (nIndex = 0; nIndex < nLenKeys; nIndex++) {
                aKey = aKeys[nIndex];
                str = str.replace(new RegExp(escapeRegExp('"' + aKey[1] + '"'), 'g'), '"' + aKey[0] + '"');
            }
            obj = JSON.parse(str);
            obj._ = oKeys;
            return obj;
        }

        /**
         * Method to decompress array objects
         * @private
         * @param json
         */
        function _decompressArray(json) {
            var nIndex, nLenKeys;

            for (nIndex = 0,
                nLenKeys = json.length; nIndex < nLenKeys; nIndex++) {
                json[nIndex] = JSONC.decompress(json[nIndex]);
            }
        }

        /**
         * Method to decompress anything but array
         * @private
         * @param jsonCopy
         * @returns {*}
         */
        function _decompressOther(jsonCopy) {
            var oKeys, str, sKey;

            oKeys = JSON.parse(JSON.stringify(jsonCopy._));
            delete jsonCopy._;
            str = JSON.stringify(jsonCopy);
            for (sKey in oKeys) {
                if (oKeys.hasOwnProperty(sKey)) {
                    str = str.replace(new RegExp('"' + sKey + '"', 'g'), '"' + oKeys[sKey] + '"');
                }
            }
            return str;
        }

        /**
         * Compress a RAW JSON
         * @param json
         * @param optKeys
         * @returns {*}
         */
        JSONC.compress = function(json, optKeys) {
            if (!optKeys) {
                _nCode = -1;
            }
            var aKeys = optKeys || [],
                obj;

            if (_isArray(json)) {
                _compressArray(json, aKeys);
                obj = json;
            } else {
                obj = _compressOther(json, aKeys);
            }
            return obj;
        };
        /**
         * Use LZString to get the compressed string.
         * @param json
         * @param bCompress
         * @returns {String}
         */
        JSONC.pack = function(json, bCompress) {
            var str = JSON.stringify((bCompress ? JSONC.compress(json) : json));
            return Base64.encode(String.fromCharCode.apply(String, gzip.zip(str, {
                level: 9
            })));
        };
        /**
         * Decompress a compressed JSON
         * @param json
         * @returns {*}
         */
        JSONC.decompress = function(json) {
            var str, jsonCopy = JSON.parse(JSON.stringify(json));
            if (_isArray(jsonCopy)) {
                _decompressArray(jsonCopy);
            } else {
                str = _decompressOther(jsonCopy);
            }
            return str ? JSON.parse(str) : jsonCopy;
        };

        function getArr(str) {
            var nIndex = 0,
                nLen = str.length,
                arr = [];
            for (; nIndex < nLen; nIndex++) {
                arr.push(str.charCodeAt(nIndex));
            }
            return arr;
        }

        /**
         * Returns the JSON object from the LZW string
         * @param gzipped
         * @param bDecompress
         * @returns {Object}
         */
        JSONC.unpack = function(gzipped, bDecompress) {
            var aArr = getArr(Base64.decode(gzipped)),
                str = String.fromCharCode.apply(String, gzip.unzip(aArr, {
                    level: 9
                })),
                json = JSON.parse(str);
            return bDecompress ? JSONC.decompress(json) : json;
        };
        /*
         * Expose Hydra to be used in node.js, as AMD module or as global
         */
        root.JSONC = JSONC;
        if (isNodeEnvironment) {
            module.exports = JSONC;
        } else if (typeof define !== 'undefined') {
            define('jsoncomp', [], function() {
                return JSONC;
            });
        }
    }
    .call(this));


window['data'] = {};
window['csv_result'] = {}

function printPapaObject(papa) {
	var header = "";
	var tbody = "";
	for (var p in papa.meta.fields) {
		header += "<th>" + papa.meta.fields[p] + "</th>";
	}
	var error_indices = _.pluck(papa.errors, 'row');
	var rows = papa.data;
	for (var i = 0; i < rows.length && !_.contains(error_indices, i); i++) {
		var row = "";
		for (var z in rows[i]) {
			row += "<td>" + rows[i][z] + "</td>";
		}
		tbody += "<tr>" + row + "</tr>";
	}
	//build a table
	$("output").html(
		'<div style="overflow:auto; height:400px;"><table class="pure"><thead>' +
		header +
		"</thead><tbody>" +
		tbody +
		"</tbody></table></div>"
	);
}

function handleFileSelect(evt) {
	var file = evt.target.files[0];
	Papa.parse(file, {
		header: true,
		dynamicTyping: true,
		worker: true,
		complete: function (results) {
			window.data = results;
			// ======================== Sanitization ========================
			sparse_columns = [];
			if (results.errors > 0)
				console.error(result.errors);
			data.meta.fields.map(function (column) {
				value_count = _.countBy(_.pluck(data.data, column))[null];
				if (value_count >= 0 && value_count / data.data.length > 0.8)
					sparse_columns.push(column)
			})
			var error_indices = _.pluck(data.errors, 'row');

			var learning_dataset = _.map(data.data, function (row, idx) {
				if (_.contains(error_indices, idx))
					return
				return _.omit(row, sparse_columns);
			}).filter(function (elem) {
				return elem
			}).slice(0, 200);

			// ======================== Ignore if all values are unique ========================


			// ======================== Compression ========================
			JSONC.compress(learning_dataset)

			// Format for Apriori
			// header = "\"" + _.values(learning_dataset[0]._).join("\",\"") + "\"\n";
			learning_dataset = _.map(learning_dataset, function (obj) {
				return "\"" + _.values(obj).slice(0, -1).join("\",\"") + "\"\n"
			}).join('');
			// ======================== Mining ========================
			var worker = new Worker('apriori.js');
			worker.postMessage(learning_dataset);
			
			worker.onmessage = function (event) {
					result = event.data;
					window.csv_result = Papa.unparse(result);

					// ======================== Output HTML formatting ========================
					var rhss = result.map(function (elem) {
						return elem.rhs.join(" && ")
					});

					var lhss = result.map(function (elem) {
						return elem.lhs.join(" && ")
					});
					nodes = Array.from(new Set(_.flatten(_.pluck(result, 'lhs')).concat(_.flatten(_.pluck(result, 'rhs')))))
					$.each(nodes, function (i, w) {
						$("#keywords").append($('<span class="highlight">').text(w));
					});
					var confidences = result.map(function (elem) {
						return elem.confidence
					});
					var couples = lhss.map(function (e, i) {
						return e + " ⇒ " + rhss[i] + "  -- Confidence: " + confidences[i];
					});
					var sentences = document.querySelector('#results');
					var keywords = document.querySelector('#keywords');
		// ======================== Output HTML formatting for keywords highlighting ========================
					keywords.addEventListener('click', function (event) {
						var target = event.target;
						var text = sentences.textContent;
						var regex = new RegExp('(' + target.textContent + ')', 'ig');
						text = text.replace(regex, '<span class="highlight">$1</span>');
						sentences.innerHTML = text;
					}, false);
					document.getElementById("results").innerHTML = couples.join("\n");
					document.getElementById("results").style = "overflow:auto; height:400px;"
					printPapaObject(results);

					// Adjacency matrix
					result0 = _.clone(result)
					nodes = Array.from(new Set(_.flatten(_.pluck(result0, 'lhs')).concat(_.flatten(_.pluck(result0, 'rhs')))))
					nodes_indexes = _.invert(nodes)
					// links = result0.map(function(elem){return {'source': elem['rhs'][0], 'target': elem['lhs'][0], 'value': elem.confidence}})
					// console.log(links)
					links = result0
						.filter(function (elem) {
							return elem.confidence < 1
						})
						.map(function (elem) {
							return {
								'source': parseInt(nodes_indexes[elem['rhs'][0]]),
								'target': parseInt(nodes_indexes[elem['lhs'][0]]),
								'value': Math.floor(elem.confidence * 10 + 1)
							}
						})
					links2 = result0
						.filter(function (elem) {
							return elem.confidence < 1
						})
						.map(function (elem) {
							return {
								'source': elem['rhs'][0],
								'target': elem['lhs'][0],
								'value': Math.floor(elem.confidence * 10 + 1)
							}
						})
					nodes = _.map(nodes, function (node) {
						return {
							name: node,
							group: 1
						}
					}); // Math.floor((Math.random())*10 +1) // group = [1:10]
					// console.log(links)
					input = {
						nodes: nodes,
						links: links
					}
					graph = {
						nodes: nodes,
						links: links2
					}			
					
					createAdjacencyMatrix(input);
					createGraph(graph)
					document.getElementById("adjacency").setAttribute("style", "overflow:auto; height:960px; width:960px;")
					document.getElementById("graph").setAttribute("style", "overflow:auto; height:960px; width:960px;")
			};
			
			function createAdjacencyMatrix(data) {
				const adjacencyMatrix = d3.adjacencyMatrixLayout();
				console.log('adjacencyMatrix', adjacencyMatrix);
				console.log('d3', d3);

				adjacencyMatrix
					.size([870, 870])
					.nodes(data.nodes)
					.links(data.links)
					.directed(false)
					.nodeID(d => d.name);

				const matrixData = adjacencyMatrix();

				console.log(matrixData)

				const someColors = d3.scaleOrdinal()
					.range(d3.schemeCategory20b);

				d3.select('svg')
					.append('g')
					.attr('transform', 'translate(80,80)')
					.attr('id', 'adjacencyG')
					.selectAll('rect')
					.data(matrixData)
					.enter()
					.append('rect')
					.attr('width', d => d.width)
					.attr('height', d => d.height)
					.attr('x', d => d.x)
					.attr('y', d => d.y)
					.style('stroke', 'black')
					.style('stroke-width', '1px')
					.style('stroke-opacity', .1)
					.style('fill', d => someColors(d.source.group))
					.style('fill-opacity', d => d.weight * 0.8);
				// style="auto" height="960px" width="960px"
				d3.select('#adjacencyG')
					.call(adjacencyMatrix.xAxis);

				d3.select('#adjacencyG')
					.call(adjacencyMatrix.yAxis);
			}
			///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			
			
			function createGraph(graph) {
				var svg = d3.select("#graph"),
					width = +svg.attr("width"),
					height = +svg.attr("height");

				var color = d3.scaleOrdinal(d3.schemeCategory20);

				var simulation = d3.forceSimulation()
					.force("link", d3.forceLink().id(function(d) { return d.name; }))
					.force("charge", d3.forceManyBody())
					.force("center", d3.forceCenter(width / 2, height / 2));



				var link = svg.append("g")
				  .attr("class", "links")
				.selectAll("line")
				.data(graph.links)
				.enter().append("line")
				  .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

				var node = svg.append("g")
				  .attr("class", "nodes")
				.selectAll("g")
				.data(graph.nodes)
				.enter().append("g")

				var circles = node.append("circle")
				  .attr("r", 5)
				  .attr("fill", function(d) { return color(d.group); })
				  .call(d3.drag()
					  .on("start", dragstarted)
					  .on("drag", dragged)
					  .on("end", dragended));

				var lables = node.append("text")
				  .text(function(d) {
					return d.name;
				  })
				  .attr('x', 6)
				  .attr('y', 3);

				node.append("title")
				  .text(function(d) { return d.name; });

				simulation
				  .nodes(graph.nodes)
				  .on("tick", ticked);

				simulation.force("link")
				  .links(graph.links);

				function ticked() {
				link
					.attr("x1", function(d) { return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });

				node
					.attr("transform", function(d) {
					  return "translate(" + d.x + "," + d.y + ")";
					})
				}

				function dragstarted(d) {
				  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
				  d.fx = d.x;
				  d.fy = d.y;
				}

				function dragged(d) {
				  d.fx = d3.event.x;
				  d.fy = d3.event.y;
				}

				function dragended(d) {
				  if (!d3.event.active) simulation.alphaTarget(0);
				  d.fx = null;
				  d.fy = null;
				}
			}
			
			///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
			
			
		}
	});
}

$(document).ready(function () {
	$("#csv-file").change(handleFileSelect);
	// Start file download.
	document.getElementById("dwn-btn").addEventListener("click", function () {
		// Generate download of hello.txt file with some content
		if (!_.isEmpty(window.csv_result)) {
			var text = window.csv_result;
			var filename = "rules.csv";
			download(filename, text);
		}
	}, false);

});

function download(filename, text) {
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.appendChild(element);

	element.click();
	document.body.removeChild(element);
}


