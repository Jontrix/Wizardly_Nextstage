import { db } from "./firebase-config.js";

import {
    collection,
    getDocs
} from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


async function obtenerUsuarios() {

    try {

        const querySnapshot =
            await getDocs(
                collection(db, "usuarios")
            );


        querySnapshot.forEach((doc) => {

            console.log(
                doc.id,
                doc.data()
            );

        });

    } catch (error) {

        console.error(error);

    }

}


obtenerUsuarios();