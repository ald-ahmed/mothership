import * as THREE from "three";

class Robot {

    constructor(id, position, humanName, color) {
        this.id = id
        this.position = position
        this.humanName = humanName
        this.color = color
    }

    calcDistance(secondPosition) {
        return ((this.position.x - secondPosition.x)^2 +
            (this.position.y - secondPosition.y)^2 +
            (this.position.z - secondPosition.z)^2)^0.5;
    }

}

export const unboxAPIConfigObject = (objData) => {
    if (objData._id && objData.humanName && objData.position && objData.color) {
        return new Robot(objData._id, objData.position, objData.humanName, objData.color);
    }
    return {};
};

export const get3DPosition = ({ screenX, screenY, camera }) => {
    let vector = new THREE.Vector3(screenX, screenY, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(distance));
};

