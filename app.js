import * as visualizer from "./visualizer.js"

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
var sparse_columns = [];
var value_count = 0;
var result, result0, nodes, nodes_indexes, links, links2, input, graph, max_count;

var i = 0;
function move(current) {
    var elem = document.getElementById("myBar");
    var previous = current - 10;
    var id = setInterval(frame, 10);
    function frame() {
      if (previous >= current) {
        clearInterval(id);
        i = 0;
      } else {
        previous++;
        elem.style.width = previous + "%";
      }
    }

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
			if (results.errors > 0)
				console.error(results.errors);
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
			// JSONC.compress(learning_dataset) // removed

			// Format for Apriori
			// header = "\"" + _.values(learning_dataset[0]._).join("\",\"") + "\"\n";
			learning_dataset = _.map(learning_dataset, function (obj) {
				return "\"" + _.values(obj).slice(0, -1).join("\",\"") + "\"\n"
			}).join('');
			// ======================== Mining ========================
			var worker = new Worker('apriori.js');
			worker.postMessage(learning_dataset);
			/*
				var bar = new ProgressBar.Line('#progress', {
						  strokeWidth: 4,
						  easing: 'easeInOut',
						  duration: 1400,
						  color: '#FFEA82',
						  trailColor: '#eee',
						  trailWidth: 1,
						  svgStyle: {width: '100%', height: '100%'}
						});
			*/
			worker.onmessage = function (event) {
					// ======================== tracking progress ========================
					if (!event.data.end)
					{
						max_count = event.data.max_count;
						// bar.animate((event.data.message / max_count));
						move(Math.ceil((event.data.message / max_count)*100))
						return
					}
					result = event.data.message;
					
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
					
					visualizer.visualize(input, graph);
					move(100)
			};			
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


