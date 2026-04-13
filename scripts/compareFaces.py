#!/usr/bin/env python3
"""
Face comparison script using face_recognition library
Install: pip install face_recognition
"""

import sys
import json
import face_recognition

def compare_faces(id_path, selfie_path):
    try:
        # Load both images
        id_image = face_recognition.load_image_file(id_path)
        selfie_image = face_recognition.load_image_file(selfie_path)

        # Extract face encodings
        id_encodings = face_recognition.face_encodings(id_image)
        selfie_encodings = face_recognition.face_encodings(selfie_image)

        if not id_encodings:
            return {"match": False, "similarity": 0, "message": "No face detected in ID photo"}

        if not selfie_encodings:
            return {"match": False, "similarity": 0, "message": "No face detected in selfie"}

        id_encoding = id_encodings[0]
        selfie_encoding = selfie_encodings[0]

        # Calculate face distance
        distance = face_recognition.face_distance([id_encoding], selfie_encoding)[0]
        similarity = round(max(0, (1 - distance) * 100))
        match = bool(distance < 0.5)

        return {
            "match": match,
            "similarity": similarity,
            "message": "Identity verified successfully" if match else "Face does not match ID photo"
        }

    except Exception as e:
        return {"match": False, "similarity": 0, "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"match": False, "similarity": 0, "message": "Invalid arguments"}))
        sys.exit(1)

    result = compare_faces(sys.argv[1], sys.argv[2])
    print(json.dumps(result))
