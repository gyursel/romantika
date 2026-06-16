command: """
python3 - <<'PY'
import json, subprocess, re

def sh(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""

cpu = 18
top = sh("top -l 1 -n 0 | grep 'CPU usage'")
m = re.search(r'(\d+(?:\.\d+)?)% user.*?(\d+(?:\.\d+)?)% sys', top)
if m:
    cpu = round(float(m.group(1)) + float(m.group(2)))

ram = 42
try:
    total = int(sh("sysctl -n hw.memsize")) / 4096
    vm = sh("vm_stat")
    vals = {}
    for line in vm.splitlines():
        mm = re.search(r'(.+?):\s+(\d+)', line.replace('.', ''))
        if mm:
            vals[mm.group(1)] = int(mm.group(2))
    used = vals.get("Pages active",0) + vals.get("Pages wired down",0) + vals.get("Pages occupied by compressor",0)
    ram = round((used / total) * 100)
except Exception:
    pass

ssd = 31
df = sh("df -H / | tail -1")
parts = df.split()
if len(parts) >= 5:
    try:
        ssd = int(parts[4].replace('%',''))
    except Exception:
        pass

temp = 46
t = sh("osx-cpu-temp | sed 's/[^0-9.]//g'")
try:
    temp = round(float(t))
except Exception:
    pass

print(json.dumps({"cpu": cpu, "ram": ram, "ssd": ssd, "temp": temp}))
PY
"""

refreshFrequency: 2000

makeBar = (name) ->
  out = ""
  for i in [0...12]
    out += "<i class='bar-seg #{name}-seg'></i>"
  out

render: ->
  """
  <div id="galioHudSystem" class="hud-widget">
    <div class="hud-frame">
      <div class="row">
        <div class="label">CPU</div>
        <div class="bar cpu-bar">#{makeBar("cpu")}</div>
        <div class="value cpu-value">18%</div>
      </div>

      <div class="row">
        <div class="label">RAM</div>
        <div class="bar ram-bar">#{makeBar("ram")}</div>
        <div class="value ram-value">42%</div>
      </div>

      <div class="row">
        <div class="label">SSD</div>
        <div class="bar ssd-bar">#{makeBar("ssd")}</div>
        <div class="value ssd-value">31%</div>
      </div>

      <div class="row">
        <div class="label">TEMP</div>
        <div class="temp-line"></div>
        <div class="value temp-value">46°C</div>
      </div>
    </div>

    <div class="edit-menu">
      <div class="menu-title">EDIT HUD</div>

      <label>FONT</label>
      <select class="fontSelect">
        <option>Orbitron</option>
        <option>Rajdhani</option>
        <option>Helvetica Neue</option>
        <option>Arial</option>
        <option>Menlo</option>
        <option>Monaco</option>
      </select>

      <label>TEXT COLOR</label>
      <div class="colors textColors">
        <button data-color="#ffb13b"></button>
        <button data-color="#000000"></button>
        <button data-color="#ffffff"></button>
        <button data-color="#2f8cff"></button>
        <button data-color="#2ee68f"></button>
        <button data-color="#ff4040"></button>
      </div>

      <label>BAR COLOR</label>
      <div class="colors barColors">
        <button data-color="#ffb13b"></button>
        <button data-color="#000000"></button>
        <button data-color="#ffffff"></button>
        <button data-color="#2f8cff"></button>
        <button data-color="#2ee68f"></button>
        <button data-color="#ff4040"></button>
      </div>

      <label>SIZE</label>
      <input class="sizeRange" type="range" min="0.35" max="5.0" step="0.01">

      <button class="closeBtn">CLOSE</button>
    </div>

    <div class="resize-handle"></div>
  </div>
  """

style: """
  top: 160px
  left: 160px
  width: 190px
  height: 260px
  position: fixed
  z-index: 99999
  pointer-events: auto

  .hud-widget
    position: relative
    width: 190px
    height: 260px
    transform-origin: top left
    color: #ffb13b
    font-family: Orbitron, Rajdhani, "Helvetica Neue", Arial, sans-serif
    text-shadow: 0 0 10px rgba(255,150,20,.75)
    user-select: none
    cursor: default
    overflow: visible

  .hud-frame
    position: absolute
    inset: 0
    border-radius: 16px
    overflow: visible
    cursor: grab
    background: transparent

  .hud-frame:active
    cursor: grabbing

  .row
    position: relative
    display: grid
    grid-template-columns: 34px 1fr 36px
    align-items: center
    gap: 6px
    padding: 0 6px
    height: 58px
    top: 10px
    font-weight: 700
    letter-spacing: 1.5px

  .label
    font-size: 11px
    width: 30px
    text-align: right
    flex-shrink: 0

  .value
    font-size: 11px
    width: 32px
    text-align: left
    white-space: nowrap
    flex-shrink: 0

  .bar
    display: flex
    gap: 2px
    align-items: center
    overflow: visible

  .bar-seg
    display: inline-block
    width: 8px
    height: 18px
    border-radius: 2px
    background: rgba(255,170,35,0.25)

  .bar-seg.on
    background: #ffb13b
    box-shadow: 0 0 6px rgba(255,165,35,0.9)

  .temp-line
    height: 1px
    background: linear-gradient(90deg, transparent, rgba(255,170,35,.45), transparent)

  .edit-menu
    display: none
    position: absolute
    left: 175px
    top: 0
    width: 220px
    padding: 16px
    border-radius: 18px
    background: rgba(10,10,10,.95)
    border: 1px solid rgba(255,170,35,.55)
    box-shadow: 0 20px 50px rgba(0,0,0,.85)
    color: #fff
    text-shadow: none
    font-family: Arial, sans-serif
    cursor: default

  .hud-widget.edit .edit-menu
    display: block

  .menu-title
    color: #ffb13b
    font-weight: bold
    margin-bottom: 14px

  label
    display: block
    font-size: 11px
    margin: 12px 0 6px
    opacity: .75

  select, input
    width: 100%

  .colors
    display: flex
    gap: 8px

  .colors button
    width: 24px
    height: 24px
    border-radius: 50%
    border: 1px solid rgba(255,255,255,.45)

  .closeBtn
    margin-top: 14px
    width: 100%
    height: 32px
    background: transparent
    color: #ffb13b
    border: 1px solid rgba(255,170,35,.6)
    border-radius: 8px

  .resize-handle
    display: none
    position: absolute
    right: 5px
    bottom: 5px
    width: 16px
    height: 16px
    cursor: nwse-resize
    border-right: 2px solid #ffb13b
    border-bottom: 2px solid #ffb13b

  .hud-widget.edit .resize-handle
    display: block
"""

update: (output, domEl) ->
  root = domEl.querySelector("#galioHudSystem")
  return unless root

  unless root.dataset.ready == "yes"
    root.dataset.ready = "yes"

    key = "galioHudSystemSettings"

    load = ->
      try
        JSON.parse(localStorage.getItem(key) or "{}")
      catch e
        {}

    save = (s) ->
      localStorage.setItem(key, JSON.stringify(s))

    applySettings = ->
      s = load()
      text = s.text or "#ffb13b"
      bar  = s.bar  or "#ffb13b"
      scale = s.scale or "1"
      font  = s.font  or "Orbitron"

      root.style.color = text
      root.style.fontFamily = font
      root.style.transform = "scale(" + scale + ")"
      domEl.style.left = (s.x or 160) + "px"
      domEl.style.top  = (s.y or 160) + "px"

      for el in root.querySelectorAll(".bar-seg.on")
        el.style.background = bar
        el.style.boxShadow  = "0 0 8px " + bar

      for el in root.querySelectorAll(".resize-handle")
        el.style.borderColor = bar

      size    = root.querySelector(".sizeRange")
      fontSel = root.querySelector(".fontSelect")
      if size    then size.value    = scale
      if fontSel then fontSel.value = font

    applySettings()

    # BUG FIX: guard e.target.closest for non-element nodes
    root.ondblclick = (e) ->
      return unless e.target and e.target.closest
      return if e.target.closest(".edit-menu")
      root.classList.toggle("edit")

    closeBtn = root.querySelector(".closeBtn")
    if closeBtn
      closeBtn.onclick = ->
        root.classList.remove("edit")

    fontSelect = root.querySelector(".fontSelect")
    if fontSelect
      fontSelect.onchange = (e) ->
        s = load()
        s.font = e.target.value
        save(s)
        applySettings()

    sizeRange = root.querySelector(".sizeRange")
    if sizeRange
      sizeRange.oninput = (e) ->
        s = load()
        s.scale = e.target.value
        save(s)
        applySettings()

    for btn in root.querySelectorAll(".textColors button")
      btn.style.background = btn.dataset.color
      btn.onclick = (e) ->
        s = load()
        s.text = e.target.dataset.color
        save(s)
        applySettings()

    for btn in root.querySelectorAll(".barColors button")
      btn.style.background = btn.dataset.color
      btn.onclick = (e) ->
        s = load()
        s.bar = e.target.dataset.color
        save(s)
        applySettings()

    dragging   = false
    resizing   = false
    ox         = 0
    oy         = 0
    startX     = 0
    startScale = 1

    frame  = root.querySelector(".hud-frame")
    handle = root.querySelector(".resize-handle")

    if frame
      frame.onmousedown = (e) ->
        # BUG FIX: use `unless` instead of confusing `== false`
        return unless root.classList.contains("edit")
        dragging = true
        ox = e.clientX - domEl.offsetLeft
        oy = e.clientY - domEl.offsetTop
        e.preventDefault()

    if handle
      handle.onmousedown = (e) ->
        return unless root.classList.contains("edit")
        resizing   = true
        startX     = e.clientX
        startScale = parseFloat(load().scale or "1")
        e.preventDefault()
        e.stopPropagation()

    document.addEventListener "mousemove", (e) ->
      if dragging
        s   = load()
        s.x = e.clientX - ox
        s.y = e.clientY - oy
        save(s)
        applySettings()

      if resizing
        diff     = e.clientX - startX
        newScale = Math.max(0.35, Math.min(5.0, startScale + diff / 220))
        s        = load()
        s.scale  = String(newScale)
        save(s)
        applySettings()

    document.addEventListener "mouseup", ->
      dragging = false
      resizing = false

  data = {}
  try
    data = JSON.parse(output)
  catch e
    data = {cpu: 18, ram: 42, ssd: 31, temp: 46}

  setBar = (name, val) ->
    segs   = root.querySelectorAll("." + name + "-seg")
    filled = Math.round((Number(val) / 100) * 12)
    for seg, i in segs
      if i < filled
        seg.classList.add("on")
      else
        seg.classList.remove("on")

  root.querySelector(".cpu-value").innerText  = data.cpu  + "%"
  root.querySelector(".ram-value").innerText  = data.ram  + "%"
  root.querySelector(".ssd-value").innerText  = data.ssd  + "%"
  root.querySelector(".temp-value").innerText = data.temp + "°C"

  setBar("cpu", data.cpu)
  setBar("ram", data.ram)
  setBar("ssd", data.ssd)

  # BUG FIX: removed `root.dataset.ready = "no"` — caused listeners to re-attach every 2s
