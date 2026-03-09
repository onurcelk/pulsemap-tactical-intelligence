import React from 'react';
import Joyride, { Step, STATUS, CallBackProps } from 'react-joyride';

interface OnboardingTourProps {
    run: boolean;
    onFinish: () => void;
}

export default function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
    const steps: Step[] = [
        {
            target: 'body',
            placement: 'center',
            content: (
                <div className="text-left">
                    <h3 className="text-lg font-black uppercase tracking-widest text-[var(--ink)] mb-1">Welcome, Agent</h3>
                    <p className="text-sm text-[var(--ink-dim)]">Establish tactical oversight of global events with PulseMap. Let's brief you on the system controls.</p>
                </div>
            ),
            disableBeacon: true,
        },
        {
            target: '#sidebar-filter-toggle',
            content: 'Filter intelligence by category. Silence the noise to focus on critical military moves, humanitarian crises, or civil unrest.',
            placement: 'right',
        },
        {
            target: '#sidebar-intel-feed',
            content: 'Incoming tactical reports stream here in real-time. Verified events are marked for priority analysis.',
            placement: 'right',
        },
        {
            target: '#sidebar-dashboard-toggle',
            content: 'Access your Strategic Dashboard to customize your command view with draggable and resizable widgets.',
            placement: 'right',
        },
        {
            target: '#sidebar-activity-toggle',
            content: 'Monitor the system console for audit logs of all global operations and telemetry syncs.',
            placement: 'right',
        },
        {
            target: '.leaflet-container',
            content: 'The tactical map. Interact with flashing nodes to dive deep into local intelligence and live aircraft/ship movements.',
            placement: 'center',
        }
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            onFinish();
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            scrollToFirstStep
            showProgress
            showSkipButton
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    arrowColor: 'var(--bg)',
                    backgroundColor: 'var(--bg)',
                    overlayColor: 'rgba(0, 0, 0, 0.8)',
                    primaryColor: 'var(--accent)',
                    textColor: 'var(--ink)',
                    zIndex: 10000,
                },
                tooltip: {
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    border: '1px solid var(--line)',
                },
                buttonNext: {
                    backgroundColor: 'var(--accent)',
                    borderRadius: '0.75rem',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    padding: '0.75rem 1.5rem',
                    transition: 'all 0.2s',
                },
                buttonBack: {
                    marginRight: '1rem',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'var(--ink-dim)',
                },
                buttonSkip: {
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    opacity: 0.5,
                }
            }}
        />
    );
}
