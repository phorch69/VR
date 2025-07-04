import * as THREE from 'three';

/* -- VR -- */

/**/
import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, raycaster, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let room, marker, floor, baseReferenceSpace;

let INTERSECTION;
const tempMatrix = new THREE.Matrix4();

init();

function init() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x505050 );

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 10 );
    camera.position.set( 0, 1, 3 );

    room = new THREE.LineSegments(
        new BoxLineGeometry( 6, 6, 6, 10, 10, 10 ).translate( 0, 3, 0 ),
        new THREE.LineBasicMaterial( { color: 0xbcbcbc } )
    );
    scene.add( room );

    scene.add( new THREE.HemisphereLight( 0xa5a5a5, 0x898989, 3 ) );

    const light = new THREE.DirectionalLight( 0xffffff, 3 );
    light.position.set( 1, 1, 1 ).normalize();
    scene.add( light );

    marker = new THREE.Mesh(
        new THREE.CircleGeometry( 0.25, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial( { color: 0xbcbcbc } )
    );
    scene.add( marker );

    floor = new THREE.Mesh(
        new THREE.PlaneGeometry( 4.8, 4.8, 2, 2 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial( { color: 0xbcbcbc, transparent: true, opacity: 0.25 } )
    );
    scene.add( floor );

    raycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animate );

    renderer.xr.addEventListener( 'sessionstart', () => baseReferenceSpace = renderer.xr.getReferenceSpace() );
    renderer.xr.enabled = true;

    document.body.appendChild( renderer.domElement );
    document.body.appendChild( VRButton.createButton( renderer ) );

    // controllers

    function onSelectStart() {

        this.userData.isSelecting = true;

    }

    function onSelectEnd() {

        this.userData.isSelecting = false;

        if ( INTERSECTION ) {

            const offsetPosition = { x: - INTERSECTION.x, y: - INTERSECTION.y, z: - INTERSECTION.z, w: 1 };
            const offsetRotation = new THREE.Quaternion();
            const transform = new XRRigidTransform( offsetPosition, offsetRotation );
            const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace( transform );

            renderer.xr.setReferenceSpace( teleportSpaceOffset );

        }

    }

    controller1 = renderer.xr.getController( 0 );
    controller1.addEventListener( 'selectstart', onSelectStart );
    controller1.addEventListener( 'selectend', onSelectEnd );
    controller1.addEventListener( 'connected', function ( event ) {

        this.add( buildController( event.data ) );

    } );
    controller1.addEventListener( 'disconnected', function () {

        this.remove( this.children[ 0 ] );

    } );
    scene.add( controller1 );

    controller2 = renderer.xr.getController( 1 );
    controller2.addEventListener( 'selectstart', onSelectStart );
    controller2.addEventListener( 'selectend', onSelectEnd );
    controller2.addEventListener( 'connected', function ( event ) {

        this.add( buildController( event.data ) );

    } );
    controller2.addEventListener( 'disconnected', function () {

        this.remove( this.children[ 0 ] );

    } );
    scene.add( controller2 );

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip( 0 );
    controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
    scene.add( controllerGrip1 );

    controllerGrip2 = renderer.xr.getControllerGrip( 1 );
    controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
    scene.add( controllerGrip2 );

    //

    window.addEventListener( 'resize', onWindowResize, false );

}

// Función para manejar las entradas del gamepad
function handleGamepadInput() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];  // Tomamos el primer gamepad conectado

    if (gp) {
        // Obtener los valores de los joysticks (ejes)
        const leftStickX = gp.axes[0]; // Eje X del joystick izquierdo
        const leftStickY = gp.axes[1]; // Eje Y del joystick izquierdo

        // Usar los joysticks para mover el cubo
        cube.position.x += leftStickX * 0.1;
        cube.position.y -= leftStickY * 0.1;

        // Botón A (índice 0) - Ejemplo de acción con un botón
        if (gp.buttons[0].pressed) {
            console.log('Botón A presionado');
            // Podrías hacer algo más interesante, como cambiar el color del cubo
            cube.material.color.set(0xff0000);
        }

        // Botón B (índice 1) - Ejemplo de otra acción
        if (gp.buttons[1].pressed) {
            console.log('Botón B presionado');
            cube.material.color.set(0x0000ff); // Cambiar el color a azul
        }

        // Gatillo derecho (índice 7) - Para mover la cámara hacia adentro
        if (gp.buttons[7].pressed) {
            camera.position.z -= 0.1; // Acercar la cámara
        }
    }
}


function buildController( data ) {

    let geometry, material;

    switch ( data.targetRayMode ) {

        case 'tracked-pointer':

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
            geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );

            material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );

            return new THREE.Line( geometry, material );

        case 'gaze':

            geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
            material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
            return new THREE.Mesh( geometry, material );

    }

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

    INTERSECTION = undefined;

    if ( controller1.userData.isSelecting === true ) {

        tempMatrix.identity().extractRotation( controller1.matrixWorld );

        raycaster.ray.origin.setFromMatrixPosition( controller1.matrixWorld );
        raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );

        const intersects = raycaster.intersectObjects( [ floor ] );

        if ( intersects.length > 0 ) {

            INTERSECTION = intersects[ 0 ].point;

        }

    } else if ( controller2.userData.isSelecting === true ) {

        tempMatrix.identity().extractRotation( controller2.matrixWorld );

        raycaster.ray.origin.setFromMatrixPosition( controller2.matrixWorld );
        raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( tempMatrix );

        const intersects = raycaster.intersectObjects( [ floor ] );

        if ( intersects.length > 0 ) {

            INTERSECTION = intersects[ 0 ].point;

        }

    }

    if ( INTERSECTION ) marker.position.copy( INTERSECTION );

    marker.visible = INTERSECTION !== undefined;

    renderer.setAnimationLoop(animate); // Mantiene la sincronización
    handleGamepadInput();

    renderer.render( scene, camera );
}
