// CaptureMapImage.jsx

import React, { useRef, useEffect, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import FarmMapViewer from './PrintCronogramaPagePlotMap';

export default function CaptureMapImage({ onCaptured }) {
    const mapRef = useRef();

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const result = await captureRef(mapRef, {
                    format: 'png',
                    result: 'base64',
                    quality: 1,
                });
                onCaptured(result); // envia base64 para quem chamou
            } catch (err) {
                console.error('Erro ao capturar o mapa:', err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={{ position: 'absolute', left: -9999 }}>
            <View collapsable={false} ref={mapRef}>
                <FarmMapViewer />
            </View>
        </View>
    );
}