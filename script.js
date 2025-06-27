document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadContainer = document.getElementById('upload-container');
    const vizContainer = document.getElementById('visualization-container');
    const chatTitleElem = document.getElementById('chat-title');
    const legendElem = document.getElementById('legend');
    const chartElem = document.getElementById('timeline-chart');
    const dayPlusBtn = document.getElementById('day-plus');
    const dayMinusBtn = document.getElementById('day-minus');
    const timePlusBtn = document.getElementById('time-plus');
    const timeMinusBtn = document.getElementById('time-minus');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');

    // --- File Handling Logic ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) handleFile(files[0]);
    });

    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    });

    const decodeFacebookString = (str) => {
        if (!str) return str;
        try {
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.warn("Could not decode string:", str);
            return str;
        }
    };

    function handleFile(file) {
        if (!file.name.endsWith('.json')) {
            alert('請上傳 JSON 檔案！');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.participants || !data.messages || !data.title) {
                    throw new Error("Invalid chat history file format.");
                }
                const decodedTitle = decodeFacebookString(data.title);
                const decodedParticipants = (data.participants || []).map(p => ({ name: decodeFacebookString(p.name) }));
                const decodedMessages = (data.messages || []).map(m => ({
                    ...m,
                    sender_name: decodeFacebookString(m.sender_name),
                    content: m.content ? decodeFacebookString(m.content) : undefined,
                }));
                
                uploadContainer.classList.add('d-none');
                vizContainer.classList.remove('d-none');
                chatTitleElem.textContent = `聊天室: ${decodedTitle}`;
                renderVisualization({ ...data, title: decodedTitle, participants: decodedParticipants, messages: decodedMessages });
            } catch (error) {
                console.error("解析或渲染時發生錯誤:", error);
                alert('檔案格式錯誤或資料不完整，無法進行視覺化。');
            }
        };
        reader.readAsText(file);
    }

    function renderVisualization(data) {
        chartElem.innerHTML = '';
        // --- STATE MANAGEMENT ---
        let mouseTransform = d3.zoomIdentity;
        let hZoom = 1;
        let vZoom = 1;

        const daysWithMessages = new Set();
        const participants = data.participants.map(p => p.name);
        const messages = data.messages.map(msg => {
            const msgDate = new Date(msg.timestamp_ms);
            daysWithMessages.add(d3.timeDay.floor(msgDate).getTime());
            let displayContent = '';
            if (msg.content) displayContent = msg.content;
            else if (msg.photos) displayContent = `(photo${msg.photos.length > 1 ? 's' : ''})`;
            else if (msg.videos) displayContent = `(video${msg.videos.length > 1 ? 's' : ''})`;
            else if (msg.sticker) displayContent = '(sticker)';
            else if (msg.reactions) displayContent = '(reaction)';
            else if (msg.call_duration !== undefined) displayContent = '(call)';
            else if (msg.bumped_message_metadata) displayContent = '(bumped message)';
            else {
                const otherKeys = Object.keys(msg).filter(k => !['sender_name', 'timestamp_ms', 'is_geoblocked_for_viewer', 'is_unsent_image_by_messenger_kid_parent'].includes(k));
                if (otherKeys.length > 0) displayContent = `(${otherKeys[0]})`;
                else displayContent = '(message)';
            }
            return { sender: msg.sender_name, date: msgDate, content: displayContent };
        }).sort((a, b) => a.date - b.date);

        const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(participants);
        const timeDomain = d3.extent(messages, d => d.date);
        if (!timeDomain[0]) { alert("聊天紀錄中沒有有效的訊息。"); return; }
        const dayDomain = d3.timeDay.range(d3.timeDay.floor(timeDomain[0]), d3.timeDay.ceil(timeDomain[1]));

        const margin = { top: 70, right: 20, bottom: 40, left: 60 };
        const width = chartElem.clientWidth - margin.left - margin.right;
        const height = 800 - margin.top - margin.bottom;

        const xScale = d3.scaleBand().domain(dayDomain.map(d => d.getTime())).padding(0.4);
        const yScale = d3.scaleTime().domain([new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 2, 0, 0, 0)]).range([0, height]);
        
        legendElem.innerHTML = '';
        participants.forEach(p => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `<div class="legend-color" style="background-color: ${colorScale(p)};"></div><span>${p}</span>`;
            legendElem.appendChild(legendItem);
        });

        const svg = d3.select(chartElem).append("svg")
            // FIX 1: Correctly calculate SVG height
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);
            
        const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        g.append("defs").append("clipPath").attr("id", "clip").append("rect").attr("width", width).attr("height", height);
        
        const gridlinesGroup = g.append("g").attr('class', 'gridlines');
        const yAxisGroup = g.append("g").attr("class", "y-axis");
        const chartArea = g.append("g").attr("clip-path", "url(#clip)");
        const xAxisGroup = g.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${-margin.top + 35})`);

        const dayLines = chartArea.selectAll(".day-line").data(dayDomain).enter().append("line")
            .attr("class", d => daysWithMessages.has(d.getTime()) ? "day-line" : "day-line day-line-empty");
            
        const dayLabels = xAxisGroup.selectAll(".day-label").data(dayDomain).enter().append('text').attr('class', 'day-label').attr('text-anchor', 'middle');
        dayLabels.append('tspan').text(d => d3.timeFormat('%Y')(d));
        dayLabels.append('tspan').attr('dy', '1.2em').attr('x', 0).text(d => d3.timeFormat('%m/%d')(d));

        const messageGroups = chartArea.selectAll(".message-group").data(messages).enter().append("g")
            .attr("class", "message-group")
            .on("click", (event, d) => openModal(d));

        messageGroups.append("circle").attr("class", "message-circle").attr("r", 7.5).attr("fill", d => colorScale(d.sender))
            .append("title").text(d => `${d.sender} (${d3.timeFormat("%H:%M")(d.date)}):\n${d.content}`);
        messageGroups.append("text").attr("class", "message-text").attr("x", 12).attr("dy", "0.35em").text(d => d.content);
        
        // FIX 2: Use the .constrain() method for robust boundary enforcement
        const zoom = d3.zoom()
            .scaleExtent([0.1, 100])
            .extent([[0, 0], [width, height]])
            .constrain(function(transform, extent, translateExtent) {
                let { x, y, k } = transform;
                let totalKy = k * vZoom;
                if (totalKy < 1) {
                    k = 1 / vZoom;
                    totalKy = 1;
                }
                y = Math.min(y, 0);
                y = Math.max(y, height * (1 - totalKy));
                return d3.zoomIdentity.translate(x, y).scale(k);
            })
            .on("zoom", zoomed);
        
        svg.call(zoom);
        
        function scaleAboutCenter(scaleFactor, axis) {
            const t = mouseTransform;
            if (axis === 'x') {
                hZoom *= scaleFactor;
                t.x = (width / 2) * (1 - scaleFactor) + t.x * scaleFactor;
            } else { // axis === 'y'
                vZoom *= scaleFactor;
                t.y = (height / 2) * (1 - scaleFactor) + t.y * scaleFactor;
            }
            // Manually trigger the zoom event's constraint logic after button press
            const constrained_t = zoom.constrain()(t, [[0,0],[width,height]]);
            mouseTransform = constrained_t;
            redraw();
        }

        timePlusBtn.onclick = () => scaleAboutCenter(1.2, 'y');
        timeMinusBtn.onclick = () => scaleAboutCenter(1 / 1.2, 'y');
        dayPlusBtn.onclick = () => scaleAboutCenter(1.2, 'x');
        dayMinusBtn.onclick = () => scaleAboutCenter(1 / 1.2, 'x');

        function zoomed(event) {
            mouseTransform = event.transform;
            redraw();
        }
        
        function redraw() {
            const totalKx = mouseTransform.k * hZoom;
            const totalKy = mouseTransform.k * vZoom;
            const tx = mouseTransform.x;
            const ty = mouseTransform.y;

            const yTransform = d3.zoomIdentity.translate(0, ty).scale(totalKy);
            const newYScale = yTransform.rescaleY(yScale);
            
            const newXRange = [tx, width * totalKx + tx];
            const newXScale = xScale.copy().range(newXRange);
            
            yAxisGroup.call(d3.axisLeft(newYScale).ticks(d3.timeHour.every(1)).tickFormat(d3.timeFormat("%H")));
            gridlinesGroup.html('').call(d3.axisLeft(newYScale).ticks(d3.timeHour.every(1)).tickSize(-width).tickFormat(""));
            gridlinesGroup.select(".domain").remove();

            dayLabels.attr('transform', d => `translate(${newXScale(d.getTime()) + newXScale.bandwidth() / 2}, 0)`);
            
            let lastLabelX = -Infinity;
            const minLabelSpacing = 80;
            dayLabels.each(function(d) {
                const labelNode = d3.select(this);
                const currentX = newXScale(d.getTime()) + newXScale.bandwidth() / 2;
                // FIX 3: Simplified logic to only prevent overlap
                if (currentX < 0 || currentX > width) {
                     labelNode.attr('display', 'none');
                } else if (currentX < lastLabelX + minLabelSpacing && currentX > lastLabelX) {
                    labelNode.attr('display', 'none');
                } else {
                    labelNode.attr('display', 'block');
                    lastLabelX = currentX;
                }
            });

            dayLines
                .attr("x1", d => newXScale(d.getTime()) + newXScale.bandwidth() / 2)
                .attr("x2", d => newXScale(d.getTime()) + newXScale.bandwidth() / 2)
                .attr("y1", newYScale.range()[0])
                .attr("y2", newYScale.range()[1]);

            messageGroups.attr("transform", d => {
                const timeForYScale = new Date(2000, 0, 1, d.date.getHours(), d.date.getMinutes(), d.date.getSeconds(), d.date.getMilliseconds());
                const x = newXScale(d3.timeDay.floor(d.date).getTime()) + newXScale.bandwidth() / 2;
                const y = newYScale(timeForYScale);
                if (!isFinite(x) || !isFinite(y)) return null;
                return `translate(${x}, ${y})`;
            });
        }
        
        function openModal(clickedMessage) {
            const centerTime = clickedMessage.date.getTime();
            const tenMinutes = 10 * 60 * 1000;
            const startTime = centerTime - tenMinutes;
            const endTime = centerTime + tenMinutes;

            const relevantMessages = messages.filter(m => {
                const msgTime = m.date.getTime();
                return msgTime >= startTime && msgTime <= endTime;
            });

            modalContent.innerHTML = '';

            const timeFormat = d3.timeFormat('%H:%M:%S');
            const fragment = document.createDocumentFragment();

            relevantMessages.forEach(msg => {
                const row = document.createElement('div');
                row.className = 'modal-message-row';

                const textContent = document.createTextNode(msg.content);
                const contentSpan = document.createElement('span');
                contentSpan.className = 'modal-message-content';
                contentSpan.appendChild(textContent);

                row.innerHTML = `
                    <span class="modal-message-time">${timeFormat(msg.date)}</span>
                    <div class="modal-sender-color" style="background-color: ${colorScale(msg.sender)};"></div>
                    <strong class="modal-message-sender">${msg.sender}:</strong>
                `;
                row.appendChild(contentSpan);
                fragment.appendChild(row);
            });

            modalContent.appendChild(fragment);
            modalOverlay.style.display = 'flex';
        }
        
        redraw();
    }
});