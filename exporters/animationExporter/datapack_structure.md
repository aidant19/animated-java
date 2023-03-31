
- datapack/
    - pack.mcmeta
    - animated_java.mcmeta
    - data/
        - minecraft/
            - tags/
                - functions/
                    - load.json
                    - tick.json
        - <project_namespace>/
            - functions/
                - summon.mcfunction
                - summon/
                    - <variant_name>.mcfunction
                - remove/
                    - this.mcfunction
                    - all.mcfunction
                - apply_variant/
                    - <variant_name>.mcfunction
                - animations/
                    - <animation_name>/
                        - play
                        - pause
                        - resume
                        - stop
            - tags/
                - functions/
                    - on_summon.json
                    - on_remove.json
                    - on_tick.json
                - entity_types/
                    - aj_root.json
                    - aj_bone.json
        - zzz_<project_namespace>_internal/
            - functions/
                - summon/
                    - as_root.mcfunction
                    - as_bone.mcfunction
                - apply_variant/
                    - <variant_name>/
                        - as_bone.mcfunction
                - remove/
                    - as_root
                - animation/
                    - tick.mcfunction
                    - <animation_name/
                        - tick.mcfunction
                        - apply_frame.mcfunction
                        - tree/
                            - branch_x_x.mcfunction
                            - leaf_x.mcfunction
                            - leaf_x_as_bone.mcfunction