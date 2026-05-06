import React, { useRef, useEffect } from 'react';

const WaterBackground = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true }) || canvas.getContext('experimental-webgl');
    const video = videoRef.current;

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    // Vertex Shader
    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        v_texCoord.y = 1.0 - v_texCoord.y;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader
    const fsSource = `
      precision highp float;
      varying vec2 v_texCoord;
      uniform sampler2D u_image;
      uniform float u_aspect;
      uniform float u_videoAspect;
      const int MAX_RIPPLES = 10;
      uniform vec3 u_ripples[MAX_RIPPLES]; // x, y, age

      void main() {
        vec2 uv = v_texCoord;
        
        // Correct Object-fit: cover logic
        float canvasAspect = u_aspect;
        float videoAspect = u_videoAspect;
        vec2 scale = vec2(1.0);
        
        if (canvasAspect > videoAspect) {
          scale.y = videoAspect / canvasAspect;
        } else {
          scale.x = canvasAspect / videoAspect;
        }
        
        uv = (uv - 0.5) * scale + 0.5;

        vec2 displacement = vec2(0.0);
        vec2 coord = v_texCoord;
        
        for (int i = 0; i < MAX_RIPPLES; i++) {
          vec3 rip = u_ripples[i];
          if (rip.z >= 0.0 && rip.z < 1.0) {
            vec2 dir = coord - rip.xy;
            dir.x *= u_aspect;
            float dist = length(dir);
            
            float radius = rip.z * 1.5;
            float strength = (1.0 - rip.z) * 0.05;
            float distToRing = abs(dist - radius);
            
            if (distToRing < 0.15) {
              float wave = sin((dist - radius) * 50.0) * strength;
              float attenuation = smoothstep(0.15, 0.0, distToRing);
              displacement += (dir / max(dist, 0.001)) * wave * attenuation;
            }
          }
        }
        
        uv += displacement;
        // Small margin to prevent texture wrap artifacts at edges
        uv = clamp(uv, 0.001, 0.999);
        
        gl_FragColor = texture2D(u_image, uv);
      }
    `;

    function compileShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      return;
    }

    // Geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uniforms = {
      uImage: gl.getUniformLocation(program, 'u_image'),
      uAspect: gl.getUniformLocation(program, 'u_aspect'),
      uVideoAspect: gl.getUniformLocation(program, 'u_videoAspect'),
      uRipples: gl.getUniformLocation(program, 'u_ripples')
    };

    let ripples = [];
    let animationFrameId;
    let videoAspect = 16 / 9;

    const handleLoadedMetadata = () => {
      videoAspect = video.videoWidth / video.videoHeight;
    };
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    video.play().catch(e => console.warn("Video playback was prevented:", e));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    let lastTime = performance.now();
    const render = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt * 0.7;
        if (ripples[i].age > 1.0) ripples.splice(i, 1);
      }

      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      }

      gl.useProgram(program);
      gl.uniform1i(uniforms.uImage, 0);
      gl.uniform1f(uniforms.uAspect, canvas.width / canvas.height);
      gl.uniform1f(uniforms.uVideoAspect, videoAspect);

      const ripplesData = new Float32Array(30);
      for (let i = 0; i < 10; i++) {
        if (i < ripples.length) {
          ripplesData[i * 3 + 0] = ripples[i].x;
          ripplesData[i * 3 + 1] = ripples[i].y;
          ripplesData[i * 3 + 2] = ripples[i].age;
        } else {
          ripplesData[i * 3 + 2] = -1;
        }
      }
      gl.uniform3fv(uniforms.uRipples, ripplesData);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handlePointerDown = (e) => {
      ripples.push({
        x: e.clientX / window.innerWidth,
        y: 1.0 - (e.clientY / window.innerHeight),
        age: 0
      });
      if (ripples.length > 10) ripples.shift();
    };
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src="/background.mp4"
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          objectPosition: 'center',
          zIndex: -2,
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none'
        }}
      />
    </>
  );
};

export default WaterBackground;


